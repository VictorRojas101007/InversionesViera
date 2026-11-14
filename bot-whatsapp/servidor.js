import http from "node:http";
import {createHmac,timingSafeEqual} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {atender} from "./bot.js";
import {api,variable} from "./datos.js";

const secreto=variable("META_APP_SECRET");
const verificador=variable("VERIFY_TOKEN");
const telefono=variable("PHONE_NUMBER_ID");
const token=variable("WHATSAPP_TOKEN");
const version=variable("GRAPH_VERSION");
for(const k of ["GEMINI_MODEL","GEMINI_API_KEY","CONTACTO_ASESOR","FIREBASE_PROJECT_ID"]) variable(k);
const db=new DatabaseSync(process.env.SQLITE_PATH || "./bot.sqlite");
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS mensajes(id TEXT PRIMARY KEY, cliente TEXT, texto TEXT, estado TEXT DEFAULT 'pendiente', intentos INTEGER DEFAULT 0, respuesta TEXT, contexto TEXT, fecha INTEGER);
CREATE TABLE IF NOT EXISTS sesiones(cliente TEXT PRIMARY KEY, datos TEXT, fecha INTEGER);`);
const guardar=db.prepare("INSERT OR IGNORE INTO mensajes(id,cliente,texto,fecha) VALUES(?,?,?,?)");
http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://localhost");
  if(u.pathname==="/salud") return res.end("OK");
  if(u.pathname!=="/webhook") {res.writeHead(404);return res.end()}
  if(req.method==="GET") {
    const ok=u.searchParams.get("hub.mode")==="subscribe" && u.searchParams.get("hub.verify_token")===verificador;
    res.writeHead(ok?200:403);return res.end(ok?u.searchParams.get("hub.challenge"):"");
  }
  if(req.method!=="POST"){res.writeHead(405);return res.end()}
  try {
    const partes=[];let bytes=0;
    for await(const parte of req){bytes+=parte.length;if(bytes>1048576){res.writeHead(413);return res.end()} partes.push(parte)}
    const cuerpo=Buffer.concat(partes);
    const firma=Buffer.from(String(req.headers["x-hub-signature-256"] || ""));
    const esperada=Buffer.from("sha256="+createHmac("sha256",secreto).update(cuerpo).digest("hex"));
    if(firma.length!==esperada.length || !timingSafeEqual(firma,esperada)){res.writeHead(403);return res.end()}
    for(const entrada of JSON.parse(cuerpo).entry || []) for(const cambio of entrada.changes || []) {
      const valor=cambio.value;
      if(valor?.metadata?.phone_number_id!==telefono) continue;
      for(const m of valor.messages || []) {
        if(m.id && m.from && Number(m.timestamp)*1000 > Date.now()-23*3600000)
          guardar.run(m.id,m.from,m.text?.body?.slice(0,4000) || "",Date.now());
      }
    }
    res.end("OK");
  } catch {res.writeHead(500);res.end()}
}).listen(process.env.PORT || 3000,()=>console.log("Webhook activo"));

async function procesar(){
  const m=db.prepare("SELECT * FROM mensajes WHERE estado='pendiente' ORDER BY rowid LIMIT 1").get();
  if(!m)return;
  if(Date.now()-m.fecha>23*3600000){db.prepare("UPDATE mensajes SET estado='vencido' WHERE id=?").run(m.id);return}
  try {
    let respuesta=m.respuesta,contexto=m.contexto;
    if(!respuesta){
      const sesion=db.prepare("SELECT * FROM sesiones WHERE cliente=?").get(m.cliente);
      const anterior=sesion && Date.now()-sesion.fecha<86400000 ? JSON.parse(sesion.datos) : {};
      let r;
      try {r=m.texto ? await atender(m.texto,anterior,api) : {texto:"Por favor envía la consulta por escrito o escribe «asesor».",estado:anterior}}
      catch(e){
        console.error("Consulta",e.message.slice(0,100));
        if(m.intentos<2)throw e;
        r={texto:"No pude verificar la cotización. Contacta a la tienda: "+api.contacto,estado:anterior};
      }
      respuesta=r.texto;contexto=JSON.stringify(r.estado);
      db.prepare("UPDATE mensajes SET respuesta=?,contexto=? WHERE id=?").run(respuesta,contexto,m.id);
    }
    const r=await fetch(`https://graph.facebook.com/${version}/${telefono}/messages`,{method:"POST",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:m.cliente,type:"text",text:{body:respuesta}})});
    if(!r.ok) throw new Error("Envío Meta "+r.status);
    db.exec("BEGIN");
    try{
      db.prepare("INSERT OR REPLACE INTO sesiones VALUES(?,?,?)").run(m.cliente,contexto,Date.now());
      db.prepare("UPDATE mensajes SET estado='enviado',texto='',respuesta=NULL,contexto=NULL WHERE id=?").run(m.id);
      db.exec("COMMIT");
    }catch(e){db.exec("ROLLBACK");throw e}
  }catch(e){
    console.error("Procesamiento",e.message.slice(0,100));
    db.prepare("UPDATE mensajes SET intentos=intentos+1,estado=CASE WHEN intentos>=4 THEN 'fallido' ELSE 'pendiente' END WHERE id=?").run(m.id);
    await new Promise(r=>setTimeout(r,2000*(m.intentos+1)));
  }
}
async function ciclo(){try{await procesar()}finally{setTimeout(ciclo,350)}}
setInterval(()=>{
  db.prepare("DELETE FROM sesiones WHERE fecha<?").run(Date.now()-86400000);
  db.prepare("DELETE FROM mensajes WHERE fecha<?").run(Date.now()-7*86400000);
},3600000).unref();
ciclo();
