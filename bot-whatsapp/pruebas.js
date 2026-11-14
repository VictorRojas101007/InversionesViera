import test from "node:test";
import assert from "node:assert/strict";
import {atender,cotizar} from "./bot.js";
const p={id:"llanta_001",descripcion:"Prueba",publicado:true,stock:8,precioUnidad:280,precioMayorista:250,minimoMayorista:4};
test("par, mínimo exacto, stock y precio ausente",()=>{
 assert.match(cotizar(p,2),/560/);assert.match(cotizar(p,4),/mayorista/);
 assert.match(cotizar(p,9),/figuran 8/);assert.match(cotizar({...p,precioMayorista:null},4),/confirmación/);
 assert.match(cotizar({...p,estadoStock:"verificar"},4),/por confirmar/);
});
test("selección por código y continuación por cantidad",async()=>{
 const api={producto:async()=>p,interpretar:async()=>({intencion:"cantidad",cantidad:4})};
 const inicio=await atender("Código: llanta_001",{},api);
 assert.equal(inicio.estado.id,p.id);
 assert.match((await atender("cuatro",inicio.estado,api)).texto,/mayorista/);
 assert.match((await atender("Código: llanta_001",{},{producto:async()=>({...p,publicado:false})})).texto,/no está/);
});
