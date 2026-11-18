import {createInterface} from "node:readline/promises";
import {atender,orientar} from "./bot.js";
import {api} from "./datos.js";
const rl=createInterface({input:process.stdin,output:process.stdout});
let estado={};
let primerMensaje=true;
console.log("Prueba con Código: TU_ID. Escribe salir para terminar.");
for (;;) {
  const texto=await rl.question("> ");
  if(texto==="salir") break;
  const esPrimerMensaje=primerMensaje;
  primerMensaje=false;
  try {const r=await atender(texto,estado,api,esPrimerMensaje);estado=r.estado;console.log(r.texto)} catch(e){console.error(e.message);console.log(orientar(estado,true).texto)}
}
rl.close();
