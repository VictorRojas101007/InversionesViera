import {normalizar} from "./bot.js";
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
 if (!r.ok) {
  const detalle = await r.text();
  console.error("Error Firestore:", r.status, detalle);
  throw new Error("Firestore " + r.status + ": " + detalle);
}
  return (await r.json()).filter(x=>x.document).map(({document:d})=>{
    const p={};
    for (const [k,v] of Object.entries(d.fields)) p[k]="integerValue" in v ? Number(v.integerValue) : Object.values(v)[0];
    return {...p,id:d.name.split("/").pop()};
  });
}
// Una sustitución, una inserción, una omisión o dos letras contiguas invertidas.
function difiereEnUnaLetra(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  if (b.length > a.length) return a.slice(i) === b.slice(i + 1);
  return a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

export function resolverMarca(texto, productos) {
  const buscada = normalizar(texto);
  const marcas = new Set(productos.map(p => normalizar(p.marca)).filter(Boolean));
  if (marcas.has(buscada)) return buscada;
  if (buscada.length < 4) return null;
  const cercanas = [...marcas].filter(marca => marca.length >= 4 && difiereEnUnaLetra(buscada, marca));
  return cercanas.length === 1 ? cercanas[0] : null;
}

const categorias = new Map();
function palabras(texto) {
  const tokens = String(texto ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || [];
  return tokens.filter(t => !["de","del","la","el","para","con","en","y","los","las"].includes(t))
    .map(t => t.replace(/([aeiou])s$/, "$1"));
}

async function buscarCatalogo({categoria, marca, medida, detalle}) {
  const adicional = ["accesorio","servicio","otros"].includes(categoria);
  const grupo = adicional ? "aro" : categoria;
  let entrada = categorias.get(grupo);
  if (!entrada || entrada.vence <= Date.now()) {
    const productos = await consultar([campo("categoria", {stringValue:grupo})]);
    entrada = {productos, vence: Date.now() + 60000};
    categorias.set(grupo, entrada);
  }
  const productos = entrada.productos.filter(p => {
    const tipo = p.tipoArticulo || (p.id.startsWith("otro_") ? "accesorio" : "");
    const esOtro = ["servicio","accesorio"].includes(tipo) || p.id.startsWith("otro_");
    if (categoria === "otros") return esOtro;
    return adicional ? tipo === categoria : !esOtro;
  });
  if (adicional) {
    const claves = palabras([detalle,marca,medida].filter(Boolean).join(" "));
    return productos.filter(p => {
      const ficha = new Set(palabras([p.name,p.descripcion,p.marca,p.modelo,p.medida].join(" ")));
      return claves.every(clave => ficha.has(clave));
    });
  }
  const marcaCatalogo = marca ? resolverMarca(marca, productos) : null;
  if (marca && !marcaCatalogo) return [];
  return productos.filter(p =>
    (!marca || normalizar(p.marca) === marcaCatalogo) &&
    (!medida || [p.medidaBusqueda, p.medida, p.medidaAro, categoria === "aro" ? p.diametroAro : null].some(m => normalizar(m) === normalizar(medida)))
  );
}
export const api={
  buscarCatalogo,
  get contacto(){return variable("CONTACTO_ASESOR")},
  async producto(id){
    if (!/^[\w-]+$/.test(id)) return null;
    const ref="projects/"+variable("FIREBASE_PROJECT_ID")+"/databases/(default)/documents/productos/"+id;
    return (await consultar([campo("__name__",{referenceValue:ref})],1))[0];
  },
  async interpretar(texto, anterior){
    if (/^asesor[.!]?$/i.test(texto.trim())) return {intencion:"asesor"};
    const modelo=variable("GEMINI_MODEL");
    const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(modelo)+":generateContent";
    const r=await fetch(url,{method:"POST",signal:AbortSignal.timeout(18000),headers:{"Content-Type":"application/json","x-goog-api-key":variable("GEMINI_API_KEY")},body:JSON.stringify({
      systemInstruction:{parts:[{text:"Extrae los datos del mensaje en español. intencion: buscar si pide productos por marca, categoría o medida, o si precisa una búsqueda anterior, cantidad si continúa una cotización seleccionada, asesor si solicita una persona, aclarar en otro caso. categoria: llanta, aro, accesorio, servicio u otros. Faros, bases, tuercas, pestañas y seguros de aro son accesorio; reparación, cambio de ruedas y arenado son servicio; otros agrupa accesorios y servicios. En accesorio o servicio extrae en detalle solo las palabras del artículo y sus características, sin verbos ni cantidad. Ejemplo «¿tienen faros para Toyota Hilux?» da categoria accesorio y detalle «faro Toyota Hilux»; «tuercas para aros» da accesorio y detalle «tuerca aro». Conserva los términos relevantes al refinar, por ejemplo «¿y con LED?» tras faros Hilux da «faro Hilux LED». Si cambia de artículo sustituye el detalle anterior. Para una petición general de accesorios o servicios omite detalle. marca: copia la marca tal como la escribió el cliente, incluso con errores; el catálogo corrige las coincidencias claras. Extrae la marca mencionada, por ejemplo «quiero llantas Michelin» da buscar, categoria llanta, marca Michelin. Si contesta con la medida tras una búsqueda por marca, extrae la medida y usa buscar. Si especifica llantas o aros tras preguntar la categoría, usa buscar. medida completa, ej. 265/70 R16 o 16 x 6.00; Para «aros de 16» extrae categoria aro, medida 16. Para «aros ACTIVE» extrae buscar, categoria aro, marca ACTIVE. «llantas aro 16» sigue siendo categoria llanta. cantidad: unidades explícitas, par son dos. Las dimensiones no son cantidades. Omite datos desconocidos. Nunca calcules precios."}]},
      contents:[{role:"user",parts:[{text:JSON.stringify({productoSeleccionado:Boolean(anterior.id),busquedaAnterior:anterior.filtros,mensaje:texto.slice(0,1600)})}]}],
      generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{intencion:{type:"STRING",enum:["buscar","cantidad","asesor","aclarar"]},cantidad:{type:"INTEGER"},categoria:{type:"STRING",enum:["llanta","aro","accesorio","servicio","otros"]},detalle:{type:"STRING"},marca:{type:"STRING"},medida:{type:"STRING"}},required:["intencion"]}}
    })});
    if (!r.ok) throw new Error("Gemini "+r.status);
    return JSON.parse((await r.json()).candidates[0].content.parts.filter(p=>!p.thought).map(p=>p.text).join(""));
  }
};
