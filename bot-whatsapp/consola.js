import {createInterface} from "node:readline/promises";
import {atender} from "./bot.js";
import {api} from "./datos.js";
const rl=createInterface({input:process.stdin,output:process.stdout});
let estado={};
console.log("Prueba con Código: TU_ID. Escribe salir para terminar.");
for (;;) {
  const texto=await rl.question("> ");
  if(texto==="salir") break;
  try {const r=await atender(texto,estado,api);estado=r.estado;console.log(r.texto)} catch(e){console.error(e.message)}
}
rl.close();
