const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const Productos = require("../data/inventario_con_imagenes_actualizado.json");
const serviceAccount = require("../../serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function actualizarInventario() {
  const coleccion = db.collection("productos");

  // Los artículos adicionales se mostrarán en la página /aros.
  const adicionales = Productos.otrosArticulos.map((producto) => ({
    ...producto,
    categoria: "aro",
  }));

  const idsAdicionales = new Set(adicionales.map((p) => String(p.id)));
  const inventario = [...Productos.llantas, ...Productos.aros, ...adicionales];

  const resultado = await coleccion.select().get();
  const idsExistentes = new Set(resultado.docs.map((doc) => doc.id));

  let actualizados = 0;
  let creados = 0;
  let omitidos = 0;

  for (let inicio = 0; inicio < inventario.length; inicio += 450) {
    const lote = db.batch();
    const grupo = inventario.slice(inicio, inicio + 450);
    let escrituras = 0;

    for (const producto of grupo) {
      const { id, ...datos } = producto;
      const documentoId = String(id);
      const referencia = coleccion.doc(documentoId);
      const esAdicional = idsAdicionales.has(documentoId);

      if (idsExistentes.has(documentoId)) {
        const cambios = {
          image: datos.image,
          imageType: datos.imageType,
          imagenReferencial: datos.imagenReferencial,
          imagenFuente: datos.imagenFuente,
          imagenDescripcionFuente: datos.imagenDescripcionFuente,
          imagenCriterio: datos.imagenCriterio,
        };

        if (esAdicional) cambios.categoria = "aro";

        lote.update(referencia, cambios);
        actualizados++;
      } else if (esAdicional) {
        lote.create(referencia, datos);
        creados++;
      } else {
        // Respeta las llantas o aros que se hayan eliminado de la tienda.
        console.log("ID ausente, se omite:", documentoId);
        omitidos++;
        continue;
      }

      escrituras++;
    }

    if (escrituras > 0) await lote.commit();
  }

  console.log(`Actualizados: ${actualizados}`);
  console.log(`Artículos creados dentro de aros: ${creados}`);
  console.log(`IDs de llantas o aros omitidos: ${omitidos}`);
}

actualizarInventario().catch((error) => {
  console.error("Error al actualizar el inventario:", error.message);
  process.exitCode = 1;
});