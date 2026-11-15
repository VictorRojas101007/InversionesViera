export const normalizar = valor => String(valor ?? "").toUpperCase().replace(/\s/g, "").replaceAll("×", "X");

export function cotizar(p, cantidad) {
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
    estado: {filtros, opciones, cantidad, pagina, siguientes}
  };
}

export async function atender(texto, anterior, api) {
  if (/^¡?(hola|buenas|buenos días|buenas tardes|buenas noches)[!. ]*$/i.test(texto.trim()))
    return {texto:"¡Hola! Soy el asistente de Inversiones Viera. ¿Qué marca o medida buscas? Puedes pedirme «aros ACTIVE» o «llantas Michelin».",estado:anterior};
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
  if (/^(llanta|aro|otro)[_-][\w-]+$/i.test(texto.trim())) return leer(texto.trim(), anterior.opciones?.includes(texto.trim()) ? anterior.cantidad : null);
  if (codigo) return leer(codigo, anterior.opciones?.includes(codigo) ? anterior.cantidad : null);
  if (anterior.filtros && anterior.opciones?.length) {
    const opcion = texto.trim().match(/^(?:(?:la\s+)?opci[oó]n\s+)?(\d+)$/i);
    if (opcion) {
      const id = anterior.opciones[Number(opcion[1]) - 1];
      if (id) return leer(id, anterior.cantidad);
      return {texto: `Elige una opción del 1 al ${anterior.opciones.length}.`, estado: anterior};
    }
    if (/^(?:ver\s+)?m[aá]s[.!]?$/i.test(texto.trim())) {
      if (!anterior.siguientes) return {texto:"Ya viste todas las opciones. ¿Cuál te interesa?", estado:anterior};
      const lista = await api.buscarCatalogo(anterior.filtros);
      if (lista.length > (anterior.pagina + 1) * porPagina)
        return mostrarOpciones(lista, anterior.filtros, anterior.cantidad, anterior.pagina + 1);
      return {texto:"Ya viste todas las opciones. ¿Cuál te interesa?", estado:anterior};
    }
  }
  const simple = texto.trim().match(/^[¿¡]?(?:(?:quiero|busco|tienes|tienen|vendes|necesito)\s+)?(?:unos?\s+|unas?\s+)?(aros?|llantas?|accesorios?|servicios?|otros)[?!.]*$/i);
  const i = simple
    ? {intencion:"buscar", categoria:simple[1].toLowerCase() === "otros" ? "otros" : simple[1].toLowerCase().replace(/s$/, "")}
    : await api.interpretar(texto, anterior);
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
  if (anterior.filtros) return {texto:"Puedes indicarme la medida, otra marca o el número de una opción de la lista.",estado:anterior};
  return {texto:"¿Buscas llanta o aro? Puedes pedirme «llantas Michelin». Escríbeme el tipo y la medida juntos, por ejemplo «llanta 265/70 R16», o envía el código desde el catálogo.",estado:{}};
}
