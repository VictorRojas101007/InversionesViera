function variable(nombre) {
  if (!process.env[nombre]) throw new Error("Falta configurar "+nombre);
  return process.env[nombre];
}
export {variable};
const campo = (nombre, valor) => ({fieldFilter:{field:{fieldPath:nombre},op:"EQUAL",value:valor}});
async function consultar(filtros, limite) {
  const proyecto=variable("FIREBASE_PROJECT_ID");
  const base="https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(proyecto)+"/databases/(default)/documents";
  const r=await fetch(base+":runQuery",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(10000),body:JSON.stringify({structuredQuery:{
    from:[{collectionId:"productos"}],where:{compositeFilter:{op:"AND",filters:[campo("publicado",{booleanValue:true}),...filtros]}},limit:limite
  }})});
  if (!r.ok) throw new Error("Firestore "+r.status+" "+(await r.json()).error?.status);
  return (await r.json()).filter(x=>x.document).map(({document:d})=>{
    const p={};
    for (const [k,v] of Object.entries(d.fields)) p[k]="integerValue" in v ? Number(v.integerValue) : Object.values(v)[0];
    return {...p,id:d.name.split("/").pop()};
  });
}
export const api={
  get contacto(){return variable("CONTACTO_ASESOR")},
  async producto(id){
    if (!/^[\w-]+$/.test(id)) return null;
    const ref="projects/"+variable("FIREBASE_PROJECT_ID")+"/databases/(default)/documents/productos/"+id;
    return (await consultar([campo("__name__",{referenceValue:ref})],1))[0];
  },
  buscar(categoria,medida){
    return consultar([campo("categoria",{stringValue:categoria}),campo("medidaBusqueda",{stringValue:medida})],5);
  },
  async interpretar(texto, anterior){
    if (/^asesor[.!]?$/i.test(texto.trim())) return {intencion:"asesor"};
    const modelo=variable("GEMINI_MODEL");
    const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelo)+":generateContent";
    const r=await fetch(url,{method:"POST",signal:AbortSignal.timeout(18000),headers:{"Content-Type":"application/json","x-goog-api-key":variable("GEMINI_API_KEY")},body:JSON.stringify({
      systemInstruction:{parts:[{text:"Extrae los datos del mensaje en español. intencion: buscar si pide una medida nueva, cantidad si continúa una cotización seleccionada, asesor si solicita una persona, aclarar en otro caso. categoria: llanta o aro solo cuando esté claro. medida completa, ej. 265/70 R16 o 16 x 6.00; aro 16 por sí solo es incompleto. cantidad: unidades explícitas, par son dos. Las dimensiones no son cantidades. Omite datos desconocidos. Nunca calcules precios."}]},
      contents:[{role:"user",parts:[{text:JSON.stringify({productoSeleccionado:Boolean(anterior.id),mensaje:texto.slice(0,1600)})}]}],
      generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{intencion:{type:"STRING",enum:["buscar","cantidad","asesor","aclarar"]},cantidad:{type:"INTEGER"},categoria:{type:"STRING",enum:["llanta","aro"]},medida:{type:"STRING"}},required:["intencion"]}}
    })});
    if (!r.ok) throw new Error("Gemini "+r.status);
    return JSON.parse((await r.json()).candidates[0].content.parts.filter(p=>!p.thought).map(p=>p.text).join(""));
  }
};
