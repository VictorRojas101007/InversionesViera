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

export async function atender(texto, anterior, api) {
  const entrada = texto.normalize("NFC").trim();
const codigoConEtiqueta = entrada.match(/^\s*c[oó]digo\s*:\s*([\w-]+)\s*$/im);
const codigo = codigoConEtiqueta?.[1] ?? entrada.match(/^(?:llanta|aro)_\d+$/i)?.[0];
  const leer = async (id, cantidad) => {
    const p = await api.producto(id);
    if (!p || p.publicado !== true) return {texto:"Ese producto no está disponible en el catálogo. ¿Qué medida buscas?",estado:{}};
    return {texto:cotizar(p,cantidad),estado:{id}};
  };
  if (codigo) return leer(codigo, anterior.opciones?.includes(codigo) ? anterior.cantidad : null);
  const i = await api.interpretar(texto, anterior);
  if (i.intencion === "asesor") return {texto:`Puedes contactar a la tienda aquí: ${api.contacto}`,estado:{}};
  if (i.intencion === "buscar" && i.medida && ["aro","llanta"].includes(i.categoria)) {
    const opciones = await api.buscar(i.categoria, normalizar(i.medida));
    if (!opciones.length) return {texto:"No encontré una coincidencia publicada para esa medida. Revisa la medida o escribe «asesor».",estado:{}};
    if (opciones.length === 1) return leer(opciones[0].id,i.cantidad);
    return {texto:"Estas son algunas opciones. Responde con la línea Código del producto que quieres:\n"+opciones.map(p=>`${p.descripcion || p.name || p.marca}\nCódigo: ${p.id}`).join("\n"),estado:{opciones:opciones.map(p=>p.id),cantidad:i.cantidad}};
  }
  if (i.intencion === "cantidad" && anterior.id && Number.isSafeInteger(i.cantidad) && i.cantidad > 0)
    return leer(anterior.id,i.cantidad);
  return {texto:"¿Buscas llanta o aro? Escríbeme el tipo y la medida juntos, por ejemplo «llanta 265/70 R16», o envía el código desde el catálogo.",estado:{}};
}
