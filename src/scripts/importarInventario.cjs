const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const Productos = require("../data/productos.json");
const serviceAccount = require("../../serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function importar() {
  const todosLosProductos = [
    ...Productos.llantas.map((producto, index) => ({
      ...producto,
      categoria: "llanta",
      id: producto.id ?? `llanta_${index + 1}`,
      publicado: producto.publicado ?? true,
    })),
    ...Productos.aros.map((producto, index) => ({
      ...producto,
      categoria: "aro",
      id: producto.id ?? `aro_${index + 1}`,
      publicado: producto.publicado ?? true,
    })),
  ];

  // Firestore admite hasta 500 escrituras por lote.
  // Usamos lotes de 450 para mantenernos debajo del límite.
  for (let inicio = 0; inicio < todosLosProductos.length; inicio += 450) {
    const lote = db.batch();
    const grupo = todosLosProductos.slice(inicio, inicio + 450);

    grupo.forEach((producto) => {
      const { id, ...datos } = producto;
      const referencia = db.collection("productos").doc(String(id));

      lote.set(referencia, datos);
    });

    await lote.commit();
    console.log(`Importados ${inicio + grupo.length} productos`);
  }

  console.log("Importación terminada");
}

importar().catch(console.error);