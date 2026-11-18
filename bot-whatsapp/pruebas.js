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

test("selecciones locales respetan la página y no llaman a Gemini", async () => {
  const lista = Array.from({length:7}, (_, n) => ({...p,id:`llanta_${n}`,descripcion:`Producto ${n}`}));
  const api = {buscarCatalogo:async()=>lista,producto:async id=>lista.find(p=>p.id===id),interpretar:async()=>{throw new Error('No debe llamarse')}};
  const inicio=await atender('llantas',{},api);
  const segunda=await atender('más',inicio.estado,api);
  for (const mensaje of ['1','el primero','quiero el primero','la primera opción','quiero la opción 1']) {
    assert.equal((await atender(mensaje,segunda.estado,api)).estado.id,'llanta_5');
  }
  assert.equal((await atender('quiero la segunda',segunda.estado,api)).estado.id,'llanta_6');
  for (const mensaje of ['0','3','el quinto']) {
    const r=await atender(mensaje,segunda.estado,api);
    assert.deepEqual(r.estado,segunda.estado);
    assert.match(r.texto,mensaje === "0" ? /número válido/ : /escribe «1»/);
  }
});

test("Gemini selecciona solo opciones válidas de la lista mostrada", async () => {
  const estado={filtros:{categoria:'llanta'},opciones:['llanta_7','llanta_8'],opcionesDetalle:[{id:'llanta_7',nombre:'Alpha'},{id:'llanta_8',nombre:'Beta'}]};
  let llamadas=0;
  const api={producto:async id=>({...p,id}),interpretar:async(texto,previo)=>{llamadas++;assert.deepEqual(previo,estado);return {intencion:'seleccionar',opcion:2}}};
  assert.equal((await atender('me quedo con la que aparece al final',estado,api)).estado.id,'llanta_8');
  assert.equal(llamadas,1);
  for (const opcion of [0,3,-1,1.5,'1',undefined]) {
    const r=await atender('esa me gusta',estado,{...api,interpretar:async()=>({intencion:'seleccionar',opcion})});
    assert.deepEqual(r.estado,estado);
    assert.match(r.texto,opcion === 3 || opcion === undefined ? /escribe «1»/ : /número/);
  }
});

test("aclaración, 503, timeout y respuesta inválida conservan lista y permiten contestar 1", async () => {
  const estado={filtros:{categoria:'llanta'},opciones:[p.id],opcionesDetalle:[{id:p.id,nombre:'Prueba'}]};
  for (const resultado of [{intencion:'aclarar'},null,new Error('Gemini 503'),new DOMException('The operation was aborted due to timeout','TimeoutError'),new SyntaxError('JSON inválido')]) {
    let llamadas=0;
    const api={producto:async()=>p,interpretar:async()=>{llamadas++;if(resultado instanceof Error)throw resultado;return resultado}};
    const ayuda=await atender('esa de ahí',estado,api);
    assert.deepEqual(ayuda.estado,estado);
    assert.match(ayuda.texto,/escribe «1»/);
    assert.doesNotMatch(ayuda.texto,/503|timeout|JSON/);
    assert.equal((await atender('1',ayuda.estado,api)).estado.id,p.id);
    assert.equal(llamadas,1);
  }
});

test("cantidades y asesor se procesan localmente; una aclaración conserva producto", async () => {
  const estado={id:p.id};
  for (const texto of ['4','quiero 4','4 unidades','cuatro']) {
    const r=await atender(texto,estado,{producto:async()=>p});
    assert.match(r.texto,/mayorista/);
  }
  const r=await atender('no sé',estado,{interpretar:async()=>({intencion:'aclarar'})});
  assert.deepEqual(r.estado,estado);
  assert.match(r.texto,/«4»/);
  assert.match((await atender('asesor',estado,{contacto:'Tienda'})).texto,/Tienda/);
});

test("saludos con errores no absorben más, aros, cantidades ni nombres", async () => {
  for(const texto of ['holaa','buenos dias','buenas tardes','buenas noches']) {
    assert.match((await atender(texto,{},{})).texto,/Qué producto buscas/);
  }
  const api={buscarCatalogo:async()=>[{...p,descripcion:'DIA'}],producto:async()=>p};
  assert.equal((await atender('aros',{},api)).estado.id,p.id);
  const estado={filtros:{categoria:'llanta'},opciones:[p.id],opcionesDetalle:[{id:p.id,nombre:'DIA'}]};
  assert.equal((await atender('DIA',estado,api)).estado.id,p.id);
});

test("petición a Gemini incluye opciones de la página y admite seleccionar", async t => {
  const {api}=await import('./datos.js');
  const previos={GEMINI_MODEL:process.env.GEMINI_MODEL,GEMINI_API_KEY:process.env.GEMINI_API_KEY};
  process.env.GEMINI_MODEL='modelo-prueba';process.env.GEMINI_API_KEY='clave-prueba';
  t.mock.method(globalThis,'fetch',async(url,opciones)=>{
    const cuerpo=JSON.parse(opciones.body);
    const contexto=JSON.parse(cuerpo.contents[0].parts[0].text);
    assert.deepEqual(contexto.opcionesMostradas,[{numero:1,id:'llanta_6',nombre:'Alpha'}]);
    assert.ok(cuerpo.generationConfig.responseSchema.properties.intencion.enum.includes('seleccionar'));
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"intencion":"seleccionar","opcion":1}'}]}}]})};
  });
  try {
    assert.deepEqual(await api.interpretar('la de arriba',{opciones:['llanta_6'],opcionesDetalle:[{id:'llanta_6',nombre:'Alpha'}]}),{intencion:'seleccionar',opcion:1});
  } finally {
    for(const [k,v] of Object.entries(previos)) if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
});

test("rechaza negativos, cero, fracciones y restas sin perder el contexto ni consultar APIs", async () => {
  for (const estado of [{},{id:p.id},{filtros:{categoria:'llanta'},opciones:[p.id]}]) {
    for (const texto of ['-1','−1','opción -1','quiero -4 llantas','menos 1','quiero 4 menos 5 llantas','4-5','0','quiero 0 llantas','1.5','opción 1,5']) {
      const r=await atender(texto,estado,{});
      assert.match(r.texto,/número.*(?:válido|entero)/);
      assert.deepEqual(r.estado,estado);
      if (/menos|[-−]/.test(texto)) assert.match(r.texto,/negativo/);
    }
    assert.match((await atender('quiero 5 menos 4 llantas',estado,{})).texto,/sin operaciones/);
  }
  assert.match(cotizar(p,-1),/negativo/);
  assert.match(cotizar(p,0),/número válido/);
});

test("valida cantidades y opciones devueltas por Gemini antes de consultar productos", async () => {
  const estado={id:p.id};
  for (const intencion of ['buscar','cantidad','seleccionar']) {
    for (const campo of ['cantidad','opcion']) {
      for (const valor of [-1,0,1.5,'4']) {
        const r=await atender('mi pedido',estado,{interpretar:async()=>({intencion,[campo]:valor})});
        assert.match(r.texto,/número/);
        assert.deepEqual(r.estado,estado);
      }
    }
  }
});

test("la validación numérica conserva códigos con guiones y medidas", async () => {
  assert.equal((await atender('llanta_abc-123',{}, {producto:async()=>p})).estado.id,'llanta_abc-123');
  let interpretado=false;
  await atender('llanta 185/65-15',{}, {interpretar:async()=>{interpretado=true;return {intencion:'aclarar'}}});
  assert.equal(interpretado,true);
});
