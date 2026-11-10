/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import Header from './Header.jsx'
import Footer from './footer.jsx'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, limit } from 'firebase/firestore'
import { db } from '../firebase.js'
import ProductCard from './ProductCard.jsx'
import { agregarProducto, eliminarProducto } from '../services/productosServices.js'



const camposPorCategoria = {
  llantas: [
    { campo: "medida", etiqueta: "Medida" },
    { campo: "aplicacion", etiqueta: "Aplicación" },
    { campo: "pr", etiqueta: "PR", tipo: "number" },
  ],
  aros: [
    { campo: "medidaAro", etiqueta: "Medida del aro" },
    { campo: "diametroAro", etiqueta: "Diámetro" },
    { campo: "anchoAro", etiqueta: "Ancho" },
    { campo: "cantidadHuecos", etiqueta: "Cantidad de huecos", tipo: "number" },
    { campo: "et", etiqueta: "ET" },
  ],
};

const filtrosPorCategoria = {
  llantas: [
    { campo: "medida", etiqueta: "Medida" },
    { campo: "tipoTerreno", etiqueta: "Tipo de terreno" },
    { campo: "pr", etiqueta: "PR" },
  ],
  aros: [
    { campo: "diametroAro", etiqueta: "Diámetro" },
    { campo: "anchoAro", etiqueta: "Ancho" },
    { campo: "cantidadHuecos", etiqueta: "Cantidad de huecos" },
  ],
};

function ProductCategory({ category, esDueno }) {

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [nuevoProducto, setNuevoProducto]= useState([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const productosPorPagina = 3;
    const [filtros, setFiltros] = useState({});

    function cambiarFiltro(campo, valor) {
  setFiltros((anteriores) => ({
    ...anteriores,
    [campo]: valor,
  }));

  setPaginaActual(1);
}

function manejarBusqueda(texto) {
  setBusqueda(texto);
  setPaginaActual(1);
}

const camposFiltro = filtrosPorCategoria[category] ?? [];
const textoBuscado = busqueda.trim().toLowerCase();

const productosFiltrados = productos.filter((product) => {
  const textoProducto = [
    product.name,
    product.descripcion,
    product.marca,
    product.medida,
    product.medidaAro,
    product.anchoAro,
    product.aplicacion,
    product.pr,
    product.tipoTerreno,
    product.diametroAro,
    product.cantidadHuecos,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const coincideTexto = textoProducto.includes(textoBuscado);
  const coincideMarca =
    !filtros.marca || product.marca === filtros.marca;

  const coincideFiltrosCategoria = camposFiltro.every(({ campo }) => {
    return (
      !filtros[campo] ||
      String(product[campo] ?? "") === filtros[campo]
    );
  });

  return coincideTexto && coincideMarca && coincideFiltrosCategoria;
});

const totalPaginas = Math.max(
  1,
  Math.ceil(productosFiltrados.length / productosPorPagina)
);

const startIndex = (paginaActual - 1) * productosPorPagina;

const productosPaginados = productosFiltrados.slice(
  startIndex,
  startIndex + productosPorPagina
);


    const camposFormulario = [
  { campo: "descripcion", etiqueta: "Nombre o descripción", requerido: true },
  { campo: "marca", etiqueta: "Marca", requerido: true },
  ...(camposPorCategoria[category] ?? []),
  { campo: "stock", etiqueta: "Stock", tipo: "number" },
  { campo: "image", etiqueta: "URL de la imagen" },
];

function cambiarCampoNuevo(e) {
  const { name, value } = e.target;

  setNuevoProducto((anterior) => ({
    ...anterior,
    [name]: value,
  }));
}

async function guardarNuevoProducto(e) {
  e.preventDefault();

  const categoriaFirestore = category === "llantas" ? "llanta" : "aro";
  const stock = Number(nuevoProducto.stock || 0);

  const datos = {
    descripcion: nuevoProducto.descripcion.trim(),
    marca: nuevoProducto.marca.trim(),
    image: nuevoProducto.image?.trim() || null,
    stock,
    publicado: true,
    destacado: false,
    categoria: categoriaFirestore,

    ...(category === "llantas"
      ? {
          medida: nuevoProducto.medida || null,
          aplicacion: nuevoProducto.aplicacion || null,
          pr: Number(nuevoProducto.pr || 0),
        }
      : {
          medidaAro: nuevoProducto.medidaAro || null,
          diametroAro: nuevoProducto.diametroAro || null,
          anchoAro: nuevoProducto.anchoAro || null,
          cantidadHuecos: Number(nuevoProducto.cantidadHuecos || 0),
          et: nuevoProducto.et || null,
        }),
  };

  try {
    const id = await agregarProducto(datos);

    // Lo agrega a la lista visible sin esperar a recargar la página.
    setProductos((actuales) => [{ ...datos, id }, ...actuales]);
    setNuevoProducto({});
    setMostrarFormulario(false);
  } catch (error) {
    console.error("Error al agregar producto:", error.code, error.message);
    alert("No se pudo agregar el producto.");
  }
}

async function manejarEliminar(producto) {
  const nombre = producto.name || producto.descripcion || producto.marca;

  if (!window.confirm(`¿Seguro que quieres borrar "${nombre}"?`)) return;

  try {
    await eliminarProducto(producto.id);

    setProductos((actuales) =>
      actuales.filter((item) => item.id !== producto.id)
    );
  } catch (error) {
    console.error("Error al eliminar producto:", error.code, error.message);
    alert("No se pudo eliminar el producto.");
  }
}

    useEffect(() => {

        let componenteActivo = true;

        async function cargarProductos(){
            setCargando(true);
            setError("");

            const categoriaFirestore =
            category === "llantas" ? "llanta" :
            category === "aros" ? "aro" :
            category;

            try{
              const consulta = query(
                collection(db, "productos"),
                where("categoria", "==", categoriaFirestore),
                where("publicado", "==", true),
                );

                const resultado = await getDocs(consulta);

                if(!componenteActivo) return;

                const productosObtenidos = resultado.docs.map((doc)=>({
                    ...doc.data(),
                    id: doc.id
                }));

                setProductos(productosObtenidos);

            }catch (error){
                console.error("Error al cargar productos:", error);
                setError("Error al cargar productos");
            }finally{
                if (componenteActivo) setCargando(false);
            }
        }

        setPaginaActual(1);
        cargarProductos();

        return () => {
            componenteActivo = false;
        };

    }, [category]);


    return (

        <>
        <Header onBuscar={manejarBusqueda} />
        <div className="filtrosProductos">
  <label>
    Marca
    <select
      value={filtros.marca ?? ""}
      onChange={(e) => cambiarFiltro("marca", e.target.value)}
    >
      <option value="">Todas</option>

      {[...new Set(productos.map((p) => p.marca).filter(Boolean))]
        .sort()
        .map((marca) => (
          <option key={marca} value={marca}>
            {marca}
          </option>
        ))}
    </select>
  </label>

  {camposFiltro.map(({ campo, etiqueta }) => {
    const opciones = [
      ...new Set(
        productos
          .map((product) => product[campo])
          .filter((valor) => valor !== null && valor !== undefined && valor !== "")
          .map(String)
      ),
    ].sort();

    return (
      <label key={campo}>
        {etiqueta}
        <select
          value={filtros[campo] ?? ""}
          onChange={(e) => cambiarFiltro(campo, e.target.value)}
        >
          <option value="">Todos</option>

          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>
    );
  })}

  <button type="button" onClick={() => setFiltros({})}>
    Limpiar filtros
  </button>
</div>
        <div className="headerContent">
            <h1>{category.toUpperCase()}</h1>
            {(productosFiltrados.length != 0) ? <p>Mostrar {productosFiltrados.length} resultados </p> : <p>Sin resultados</p>}
        </div>
        <div className='ProudctsContainer'>
            {esDueno && (
  <button
    type="button"
    onClick={() => setMostrarFormulario((visible) => !visible)}
  >
    {mostrarFormulario ? "Cancelar" : "+ Agregar producto"}
  </button>
)}

{esDueno && mostrarFormulario && (
  <form onSubmit={guardarNuevoProducto}>
    {camposFormulario.map(({ campo, etiqueta, tipo = "text", requerido }) => (
      <label key={campo}>
        {etiqueta}
        <input
          name={campo}
          type={tipo}
          value={nuevoProducto[campo] ?? ""}
          onChange={cambiarCampoNuevo}
          required={requerido ?? false}
        />
      </label>
    ))}

    <button type="submit">Guardar producto</button>
  </form>
)}

            {cargando ? (
                <p>Cargando productos...</p>
            ): error ? (
                <p>{error}</p>
            ):

            productosPaginados.map((product)=>(
               <ProductCard  onDelete={manejarEliminar} key={product.id} product={product} esDueno={esDueno}/>
            ))}

            <button  onClick={() => setPaginaActual((page) => Math.max(1, page - 1))} disabled={paginaActual===1} >
                -
            </button>
                <span> Página {paginaActual} de {totalPaginas} </span>
            <button onClick={() => setPaginaActual((page) => Math.min(totalPaginas, page + 1))} disabled={paginaActual===totalPaginas} >
                +
            </button >

        </div>
        <Footer />
        </>

    )
}
export default ProductCategory;