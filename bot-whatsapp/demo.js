import {cotizar} from "./bot.js";
const p={descripcion:"Llanta de prueba",precioUnidad:280,precioMayorista:250,minimoMayorista:4,stock:8};
for(const cantidad of [2,4]) console.log(cotizar(p,cantidad));
