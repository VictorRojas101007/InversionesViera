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

test("busca Michelin, muestra más opciones, selecciona y vuelve a cotizar", async () => {
  const lista = Array.from({length:7}, (_, n) => ({
    ...p, id:"llanta_" + n, marca:"MICHELIN", medida:"185/65 R15"
  }));
  const api = {
    interpretar: async (texto) => texto === "un par"
      ? {intencion:"cantidad",cantidad:2}
      : {intencion:"buscar",categoria:"llanta",marca:"Michelin"},
    buscarCatalogo: async filtros => {
      assert.equal(filtros.marca,"Michelin");
      return lista;
    },
    producto: async id => lista.find(item => item.id === id)
  };
  const inicio = await atender("Quiero llantas Michelin", {}, api);
  assert.equal(inicio.estado.opciones.length, 5);
  const siguiente = await atender("más", inicio.estado, api);
  const elegida = await atender("opción 2", siguiente.estado, api);
  assert.equal(elegida.estado.id, "llanta_6");
  assert.match((await atender("un par", elegida.estado, api)).texto, /560/);
});

test("corrige solo errores sencillos con una marca inequívoca", async () => {
  const {resolverMarca} = await import("./datos.js");
  const catalogo = ["MICHELIN","PIRELLI","HILO","HIFO"].map(marca => ({marca}));
  for (const texto of ["Michelin", "muchelin", "micheln", "michellin", "michelni"])
    assert.equal(resolverMarca(texto, catalogo), "MICHELIN");
  assert.equal(resolverMarca("hito", catalogo), null);
  assert.equal(resolverMarca("XYZ", catalogo), null);
});

test("aros sin marca y cambio de llantas a aros", async () => {
  const api = {buscarCatalogo: async filtros => {
    assert.equal(filtros.categoria,"aro");
    assert.ok(!filtros.marca);
    return [{id:"aro_001",marca:"ACTIVE"},{id:"aro_002",marca:"ACTIVE"}];
  }};
  for (const mensaje of ["aro", "aros", "¿Tienen aros?", "quiero unos aros"]) {
    const r = await atender(mensaje,{filtros:{categoria:"llanta",marca:"Michelin"}},api);
    assert.deepEqual(r.estado.opciones,["aro_001","aro_002"]);
  }
});

test("busca accesorios y servicios dentro de aro, por descripción y sin mezclarlos con aros", async t => {
  const {api} = await import("./datos.js");
  const productos = [
    ["otro_005","FARO CAS PARA TOYOTA HILUX","accesorio"],
    ["otro_006","FARO CON LED PARA TOYOTA HILUX","accesorio"],
    ["otro_013","SERVICIO DE ARENADO Y ENDEREZADO DE AROS","servicio"],
    ["aro_001","ARO ACTIVE",""],
  ];
  t.mock.method(globalThis,"fetch", async (url, opciones) => {
    const filtros = JSON.parse(opciones.body).structuredQuery.where.compositeFilter.filters;
    assert.equal(filtros[1].fieldFilter.value.stringValue,"aro");
    return {ok:true,json:async()=>productos.map(([id,descripcion,tipoArticulo])=>({document:{
      name:"productos/"+id,fields:{descripcion:{stringValue:descripcion},tipoArticulo:{stringValue:tipoArticulo}}
    }}))};
  });
  const proyecto = process.env.FIREBASE_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID="prueba";
  try {
    const buscar = async (categoria,detalle) => (await api.buscarCatalogo({categoria,detalle})).map(p=>p.id);
    assert.deepEqual(await buscar("accesorio","faros Toyota Hilux"),["otro_005","otro_006"]);
    assert.deepEqual(await buscar("accesorio","faros LED"),["otro_006"]);
    assert.deepEqual(await buscar("servicio","arenado"),["otro_013"]);
    assert.deepEqual(await buscar("aro"),["aro_001"]);
    assert.equal((await buscar("otros")).length,3);
  } finally {
    if (proyecto === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID=proyecto;
  }
});
