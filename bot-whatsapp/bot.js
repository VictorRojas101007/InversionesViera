export const normalizar = valor => String(valor ?? "").toUpperCase().replace(/\s/g, "").replaceAll("×", "X");

export function cotizar(p, cantidad) {
  if (cantidad != null && (!Number.isSafeInteger(cantidad) || cantidad <= 0)) return errorNumero(cantidad);
  const nombre = p.name || p.descripcion || p.marca || p.id;
  if (!Number.isSafeInteger(cantidad) || cantidad < 1) return `¿Cuántas unidades de ${nombre} deseas?`;
  if (p.estadoStock !== "verificar" && Number.isSafeInteger(p.stock) && p.stock >= 0 && p.stock < cantidad)
    return `De ${nombre} figuran ${p.stock} unidades. ¿Quieres consultar otra cantidad?`;
  const minimo = p.minimoMayorista;
  const mayor = Number.isSafeInteger(minimo) && minimo > 0 && cantidad >= minimo;
  const precio = mayor ? p.precioMayorista : p.precioUnidad;
  if (!Number.isSafeInteger(minimo) || minimo < 1 || !Number.isFinite(precio) || precio <= 0)
    return `El precio de ${nombre} requiere confirmación. Escribe «asesor» para consultar con la tienda.`;
  const soles = n => new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(n / 100);
  const centimos = Math.round(precio * 100);
  const disponible = p.estadoStock !== "verificar" && Number.isSafeInteger(p.stock) && p.stock >= cantidad;
  return `${nombre}\n${cantidad} × ${soles(centimos)} = ${soles(cantidad * centimos)} (${mayor ? "precio mayorista" : "precio unitario"}).\n${disponible ? "Cantidad disponible según el inventario." : "Disponibilidad por confirmar con la tienda."}`;
}

const porPagina = 5;

function mostrarOpciones(productos, filtros, cantidad, pagina = 0) {
  const inicio = pagina * porPagina;
  const grupo = productos.slice(inicio, inicio + porPagina);
  const opciones = grupo.map(p => p.id);
  const filas = grupo.map((p, n) => {
    const medida = p.medida || p.medidaAro;
    const estado = p.estadoStock === "agotado" ? "Agotado" : null;
    return `${n + 1}. ${[p.name || p.descripcion || p.marca, medida, estado].filter(Boolean).join(" · ")}`;
  });
  const siguientes = inicio + grupo.length < productos.length;
  return {
    texto: [`Encontré ${productos.length} opciones en el catálogo.`, ...filas,
      "¿Cuál te interesa? Dime el número de la opción o qué característica buscas." +
      (siguientes ? " Para ver las siguientes, escribe «más»." : "")].join("\n"),
    estado: {filtros, opciones, opcionesDetalle:grupo.map(p => ({id:p.id, nombre:p.name || p.descripcion || p.marca, medida:p.medida || p.medidaAro})), cantidad, pagina, siguientes}
  };
}

function extraerSaludoInicial(texto) {
  const saludo = /^\s*[¡¿]*(?:(?:buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|buenas|hola)\b[\s,!.¿¡:;-]*)+/i;
  const coincidencia = String(texto ?? "").match(saludo);
  return {
    huboSaludo: Boolean(coincidencia),
    consulta: coincidencia ? String(texto).slice(coincidencia[0].length).trim() : String(texto ?? "").trim()
  };
}

export function saludoPorHoraDePeru() {
  const hora = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(new Date()));
  if (hora >= 5 && hora < 12) return "¡Buenos días!";
  if (hora >= 12 && hora < 19) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}

function distanciaEdicion(a, b) {
  const fila = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const anterior = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = anterior;
    }
  }
  return fila[b.length];
}

function esSaludoMalEscrito(texto) {
  const frase = tokensProducto(texto).join(" ");
  if (!frase) return false;
  return ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"]
    .some(saludo => distanciaEdicion(frase, saludo) <= 1);
}

const palabrasIgnoradas = new Set([
  "la", "el", "los", "las", "un", "una", "unos", "unas", "de", "del", "para", "con",
  "quiero", "busco", "tienes", "tienen", "necesito", "me", "interesa", "interesan",
  "llanta", "llantas", "aro", "aros", "modelo", "marca", "por", "favor"
]);

function tokensProducto(texto) {
  return String(texto ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]+/g) || [];
}

function coincideNombre(texto, producto) {
  const consulta = tokensProducto(texto).filter(t => !palabrasIgnoradas.has(t));
  if (!consulta.length) return false;
  const ficha = new Set(tokensProducto([
    producto.name, producto.descripcion, producto.marca, producto.modelo,
    producto.medida, producto.medidaAro, producto.diametroAro, producto.anchoAro,
    producto.aplicacion, producto.pr
  ].filter(Boolean).join(" ")));
  return consulta.every(t => ficha.has(t));
}

function pideMasOpciones(texto) {
  const frase = String(texto ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,]/g, " ")
    .replace(/\s+/g, " ").trim();
  return /^(?:(?:quiero|quisiera|puedes|podrias|tienes|tiene|hay|muestrame|ensename|ver|dame)\s+)*(?:(?:ver|mostrar)\s+)?(?:mas|otro|otros|otra|otras|siguientes)(?:\s+(?:modelos?|opciones?|resultados?|productos?|llantas?|aros?))?$/.test(frase);
}

function extraerPedidoCantidad(texto) {
  const frase = String(texto ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,]/g, " ")
    .replace(/\s+/g, " ").trim();
  const encabezado = "(?:(?:quiero|deseo|necesito|quisiera|me llevo|dame)\\s+)?";
  const numero = "(\\d{1,3}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)";
  const sufijo = "(?:\\s+unidades?)?(?:\\s+de(?:\\s+(?:la|las|el|los))?)?(?:\\s+(llantas?|aros?|neumaticos?))?";
  const match = frase.match(new RegExp(`^${encabezado}${numero}${sufijo}$`));
  const par = frase.match(new RegExp(`^${encabezado}(?:un\\s+)?par(?:\\s+de(?:\\s+(?:la|las|el|los))?(?:\\s+(llantas?|aros?))?)?$`));
  if (!match && !par) return null;
  const valor = par ? 2 : ({un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10}[match[1]] ?? Number(match[1]));
  if (!Number.isSafeInteger(valor) || valor < 1) return null;
  const tipo = (par ? par[1] : match[2])?.replace(/s$/, "");
  return {cantidad:valor, categoria:tipo === "aro" ? "aro" : tipo ? "llanta" : null};
}

function errorNumero(valor) {
  if (typeof valor === "number" && valor < 0)
    return "Un valor negativo no es válido. Por favor, introduce un número entero mayor que cero.";
  return "Por favor, introduce un número válido: debe ser un entero mayor que cero.";
}

function validarNumeroEscrito(texto) {
  const frase = String(texto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[−–]/g, "-").replace(/[¿?¡!]/g, "").trim().replace(/\.$/, "").replace(/\s+por favor$/, "").trim();
  // Solo expresiones de cantidad/selección completas: no confundir medidas o códigos con restas.
  const match = frase.match(/^(?:(?:quiero|quisiera|necesito|deseo|dame|elijo|me llevo|me interesa)\s+)?(?:(?:el|la)\s+)?(?:(?:opcion|numero|cantidad)\s+)?((?:-\s*|menos\s+)?\d+(?:[.,]\d+)?)(?:\s*(menos|-)\s*(\d+(?:[.,]\d+)?))?(?:\s+(?:unidades?|llantas?|aros?|neumaticos?))?$/);
  if (!match) return null;
  const numero = Number(match[1].replace(/^menos\s+/, "-").replace(/\s/g, "").replace(",", "."));
  const resultado = match[2] ? numero - Number(match[3].replace(",", ".")) : numero;
  if (!Number.isSafeInteger(resultado) || resultado <= 0) return errorNumero(resultado);
  if (match[2]) return "Por favor, escribe la cantidad o el número de opción directamente, sin operaciones matemáticas.";
  return null;
}

function extraerSeleccion(texto) {
  const frase = tokensProducto(texto).join(" ").replace(/ por favor$/, "");
  const ordinales = {primero:1,primera:1,primer:1,segundo:2,segunda:2,tercero:3,tercera:3,tercer:3,cuarto:4,cuarta:4,quinto:5,quinta:5};
  const coincidencia = frase.match(/^(?:(?:quiero|quisiera|dame|elijo|me interesa|me llevo) )?(?:(?:el|la) )?(?:(?:opcion|numero|modelo) )?(\d+|primero|primera|primer|segundo|segunda|tercero|tercera|tercer|cuarto|cuarta|quinto|quinta)(?: (?:opcion|modelo))?$/);
  return coincidencia ? (ordinales[coincidencia[1]] ?? Number(coincidencia[1])) : null;
}

export function orientar(anterior, fallo = false) {
  const inicio = fallo ? "No pude procesar tu mensaje ahora. " : "No pude identificar tu elección. ";
  if (anterior.opciones?.length)
    return {texto:inicio + `Responde solo con el número de la lista anterior (del 1 al ${anterior.opciones.length}). Por ejemplo, escribe «1» para elegir el primer producto.`,estado:anterior};
  if (anterior.id)
    return {texto:inicio + "Para indicar la cantidad del producto seleccionado, escribe solo un número, por ejemplo «4». También puedes escribir «asesor».",estado:anterior};
  return {texto:inicio + "Escribe «llantas» o «aros» para ver productos, o escribe «asesor» para pedir ayuda.",estado:anterior};
}

export async function atender(texto, anterior, api, primerMensaje = false) {
  const {huboSaludo, consulta} = extraerSaludoInicial(texto);
  if ((huboSaludo && !consulta) || esSaludoMalEscrito(texto)) {
    const textoSaludo = `${saludoPorHoraDePeru()} 😊 Bienvenido a Inversiones Viera. ¿Qué producto buscas? Puedo ayudarte con llantas, aros, faros, accesorios o servicios.`;
    return {texto:primerMensaje ? textoSaludo : "¿Qué producto buscas? Puedo ayudarte con llantas, aros, faros, accesorios o servicios.",estado:anterior};
  }

  const respuesta = await atenderConsulta(huboSaludo ? consulta : texto, anterior, api);
  return primerMensaje ? {...respuesta, texto:`${saludoPorHoraDePeru()} 😊 ${respuesta.texto}`} : respuesta;
}

async function atenderConsulta(texto, anterior, api) {
  const errorEscrito = validarNumeroEscrito(texto);
  if (errorEscrito) return {texto:errorEscrito,estado:anterior};
  const codigo = texto.match(/(?:^|\n)\s*c[oó]digo:\s*([\w-]+)(?=\s|$)/i)?.[1];
  const leer = async (id, cantidad) => {
    const p = await api.producto(id);
    if (!p || p.publicado !== true) return {texto:"Ese producto no está disponible en el catálogo. ¿Qué medida buscas?",estado:{}};
    if (p.tipoArticulo === "servicio")
      return {texto:`${p.descripcion || p.name}. Para confirmar el precio y coordinar el servicio, contacta a la tienda: ${api.contacto}`,estado:{}};
    if ((p.tipoArticulo === "accesorio" || p.id.startsWith("otro_")) &&
        (p.estadoStock === "agotado" || (p.stock === 0 && p.estadoStock !== "verificar")))
      return {texto:`${p.descripcion || p.name} figura agotado en el inventario. Escribe «asesor» para consultar una reposición.`,estado:{}};
    return {texto:cotizar(p,cantidad),estado:{id}};
  };
  if (/^asesor[.!]?$/i.test(texto.trim())) return {texto:`Puedes contactar a la tienda aquí: ${api.contacto}`,estado:{}};
  const pedidoCantidad = extraerPedidoCantidad(texto);
  if (/^(llanta|aro|otro)[_-][\w-]+$/i.test(texto.trim())) return leer(texto.trim(), anterior.opciones?.includes(texto.trim()) ? anterior.cantidad : null);
  if (codigo) return leer(codigo, anterior.opciones?.includes(codigo) ? anterior.cantidad : null);
  if (anterior.filtros && anterior.opciones?.length) {
    const opcion = extraerSeleccion(texto);
    if (opcion !== null) {
      const id = anterior.opciones[opcion - 1];
      if (id) return leer(id, anterior.cantidad);
      return orientar(anterior);
    }
    if (pideMasOpciones(texto)) {
      if (!anterior.siguientes) return {texto:"Ya viste todas las opciones. ¿Cuál te interesa?", estado:anterior};
      const lista = await api.buscarCatalogo(anterior.filtros);
      if (lista.length > (anterior.pagina + 1) * porPagina)
        return mostrarOpciones(lista, anterior.filtros, anterior.cantidad, anterior.pagina + 1);
      return {texto:"Ya viste todas las opciones. ¿Cuál te interesa?", estado:anterior};
    }

    if (pedidoCantidad) {
      if (anterior.id) return leer(anterior.id, pedidoCantidad.cantidad);
      return {texto:`Anoto ${pedidoCantidad.cantidad} unidades. Primero elige el modelo por número o escribe su nombre.`,estado:{...anterior,cantidad:pedidoCantidad.cantidad}};
    }

    // Permite seleccionar por nombre/modelo, además de por número.
    const catalogo = anterior.opcionesDetalle
      ? anterior.opcionesDetalle.map(p => ({...p, name:p.nombre}))
      : await api.buscarCatalogo(anterior.filtros);
    const coincidencias = catalogo.filter(p => coincideNombre(texto, p));
    if (coincidencias.length === 1) return leer(coincidencias[0].id, anterior.cantidad);
    if (coincidencias.length > 1)
      return mostrarOpciones(coincidencias, anterior.filtros, anterior.cantidad);
  }
  if (pedidoCantidad) {
    if (anterior.id) return leer(anterior.id, pedidoCantidad.cantidad);
    if (pedidoCantidad.categoria) {
      const filtros={categoria:pedidoCantidad.categoria,marca:null,medida:null,detalle:null};
      const lista=await api.buscarCatalogo(filtros);
      if (!lista.length) return {texto:`No encontré ${pedidoCantidad.categoria === "llanta" ? "llantas" : "aros"} publicados. ¿Buscas otra medida o marca?`,estado:{filtros,cantidad:pedidoCantidad.cantidad}};
      if (lista.length===1) return leer(lista[0].id,pedidoCantidad.cantidad);
      return mostrarOpciones(lista,filtros,pedidoCantidad.cantidad);
    }
    return {texto:`¿De qué producto necesitas ${pedidoCantidad.cantidad} unidades? Escribe «llantas» o «aros», o envía el código del producto.`,estado:anterior};
  }
  const simple = texto.trim().match(/^[¿¡]?(?:(?:quiero|busco|tienes|tienen|vendes|necesito)\s+)?(?:unos?\s+|unas?\s+)?(aros?|llantas?|accesorios?|servicios?|otros)[?!.]*$/i);
  let i;
  try {
    i = simple
      ? {intencion:"buscar", categoria:simple[1].toLowerCase() === "otros" ? "otros" : simple[1].toLowerCase().replace(/s$/, "")}
      : await api.interpretar(texto, anterior);
  } catch {
    return orientar(anterior, true);
  }
  if (!i || typeof i !== "object") return orientar(anterior);
  for (const campo of ["cantidad", "opcion"]) {
    if (i[campo] != null && (!Number.isSafeInteger(i[campo]) || i[campo] <= 0))
      return {texto:errorNumero(i[campo]),estado:anterior};
  }
  if (i.intencion === "seleccionar") {
    const id = Number.isSafeInteger(i.opcion) && i.opcion > 0 ? anterior.opciones?.[i.opcion - 1] : null;
    return id ? leer(id, anterior.cantidad) : orientar(anterior);
  }
  if (i.intencion === "asesor") return {texto:`Puedes contactar a la tienda aquí: ${api.contacto}`,estado:{}};
  if (i.intencion === "buscar") {
    const previo = anterior.filtros || {};
    const categoria = i.categoria || previo.categoria;
    const conservar = !previo.categoria || categoria === previo.categoria;
    const marca = i.marca || (conservar ? previo.marca : null);
    const medida = i.medida || null;
    const filtros = {categoria, marca, medida, detalle:i.detalle || null};
    const cantidad = i.cantidad ?? (conservar ? anterior.cantidad : null);
    if (!categoria && marca)
      return {texto:`¿Buscas llantas o aros de ${marca}?`, estado:{filtros,cantidad}};
    if (["aro","llanta","accesorio","servicio","otros"].includes(categoria)) {
      const lista = await api.buscarCatalogo(filtros);
      if (!lista.length) return {texto:"No encontré productos publicados con esos datos. ¿Probamos otra medida o marca?",estado:{filtros}};
      if (lista.length === 1) return leer(lista[0].id,cantidad);
      return mostrarOpciones(lista,filtros,cantidad);
    }
  }
  if (i.intencion === "cantidad" && anterior.id && Number.isSafeInteger(i.cantidad) && i.cantidad > 0)
    return leer(anterior.id,i.cantidad);
  if (anterior.opciones?.length || anterior.id) return orientar(anterior);
  if (anterior.filtros) return {texto:"Puedes indicarme la medida, otra marca o el número de una opción de la lista.",estado:anterior};
  return {texto:"¿Buscas llanta o aro? Puedes pedirme «llantas Michelin». Escríbeme el tipo y la medida juntos, por ejemplo «llanta 265/70 R16», o envía el código desde el catálogo.",estado:{}};
}
