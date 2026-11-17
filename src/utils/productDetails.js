export const productName = (product) => product.name || product.descripcion || product.marca || 'Producto';
export const productPath = (product) => `/${product.categoria === 'llanta' ? 'llantas' : 'aros'}/${encodeURIComponent(product.id)}`;
export const formatPR = (value) => value == null || value === '' ? null : `${String(value).replace(/\s*PR$/i, '')} PR`;

export function productType(product) {
  if (product.categoria === 'llanta') return 'llanta';
  if (product.tipoArticulo === 'servicio') return 'servicio';
  if (/\b(faro|faros|neblinero)\b/i.test(productName(product))) return 'faro';
  if (product.tipoArticulo || product.categoria === 'accesorio_servicio' || String(product.id).startsWith('otro_')) return 'otro';
  return 'aro';
}

export const typeLabels = { llanta: 'Llantas', aro: 'Aros', faro: 'Faros e iluminación', otro: 'Accesorios', servicio: 'Servicios' };

export function productSpecs(product) {
  const type = productType(product);
  const fields = type === 'llanta'
    ? [['Modelo', product.modelo], ['Medida nominal', product.medida], ['Ancho', product.ancho], ['Perfil', product.perfil], ['Aro compatible', product.aro], ['Capacidad de lonas (PR)', formatPR(product.pr)], ['Aplicación', product.aplicacion], ['Tipo de terreno', product.tipoTerreno]]
    : type === 'aro'
      ? [['Medida nominal', product.medidaAro], ['Diámetro', product.diametroAro], ['Ancho', product.anchoAro], ['Cantidad de huecos', product.cantidadHuecos], ['Offset (ET)', product.et], ['PCD', product.pcd], ['Material', product.material]]
      : [['Tipo de artículo', product.tipoArticulo], ['Modelo', product.modelo], ['Compatibilidad', product.compatibilidad], ['Referencia', product.referencia], ['Tecnología', product.tecnologia], ['Voltaje', product.voltaje], ['Potencia', product.potencia], ['Posición', product.posicion], ['Medida', product.medida], ['Material', product.material]];
  return [['Categoría', typeLabels[type]], ['Marca', product.marca], ...fields].filter(([, value]) => value != null && value !== '');
}

export function stockLabel(product) {
  if (product.tipoArticulo === 'servicio') return 'Consultar disponibilidad';
  if (product.stock == null || product.stock === '' || !Number.isFinite(Number(product.stock)) || Number(product.stock) < 0 || product.stockVerificado === false) return 'Consultar disponibilidad';
  return Number(product.stock) === 0 ? 'Agotado' : `${product.stock} unidades disponibles`;
}

export function quoteLink(product) {
  const message = ['Hola, quiero información sobre este producto:', productName(product), `Código: ${product.id}`, ...productSpecs(product).map(([label, value]) => `${label}: ${value}`), '¿Me confirman disponibilidad y cotización?'].join('\n');
  return `https://wa.me/51937042895?text=${encodeURIComponent(message)}`;
}

export function productShareText(product, origin) {
  return [
    'Inversiones Viera',
    productName(product),
    product.descripcion && product.descripcion !== productName(product) ? product.descripcion : null,
    ...productSpecs(product).map(([label, value]) => `${label}: ${value}`),
    product.destacado ? 'Producto destacado' : null,
    product.imagenReferencial ? 'Imagen referencial' : null,
    `Ver producto: ${new URL(productPath(product), origin).href}`,
  ].filter((line) => line != null && line !== '').join('\n');
}
