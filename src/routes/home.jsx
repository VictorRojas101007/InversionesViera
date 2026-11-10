
import Footer from '../components/footer.jsx'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import obtenerProductosDestacados, { obtenerProductosPublicados } from '../services/productosServices.js'



function Home() {
    const [destacados, setDestacados] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [productosBusqueda, setProductosBusqueda] = useState(null);
    const [errorBusqueda, setErrorBusqueda] = useState(false);
    const busquedaActiva = Boolean(busqueda.trim());

    useEffect(() => {
        if (!busquedaActiva || productosBusqueda !== null) return;
        let activo = true;
        obtenerProductosPublicados()
            .then((productos) => {
                if (activo) {
                    setProductosBusqueda(productos);
                    setErrorBusqueda(false);
                }
            })
            .catch(() => {
                if (activo) setErrorBusqueda(true);
            });
        return () => { activo = false; };
    }, [busquedaActiva, productosBusqueda]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
    let componenteActivo = true;

    async function cargarDestacados() {
      try {
        const [llantas, aros] = await Promise.all([
          obtenerProductosDestacados("llanta", 3),
          obtenerProductosDestacados("aro", 2),
        ]);

        if (componenteActivo) {
          setDestacados([...llantas, ...aros]);
        }
      } catch (error) {
        console.error("Error al cargar destacados:", error);
        if (componenteActivo) setError("No se pudieron cargar los destacados.");
      } finally {
        if (componenteActivo) setCargando(false);
      }
    }

    cargarDestacados();

    return () => {
      componenteActivo = false;
    };
  }, []);


    const textoBuscado = busqueda.trim().toLowerCase();
    const resultados = (productosBusqueda ?? []).filter((product) =>
        [product.name, product.descripcion, product.marca, product.medida, product.medidaAro]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(textoBuscado)
    );

    return (
        <div className="homePage">
            <Header onBuscar={setBusqueda} resultadosBusqueda={
                <section className="homeSearchResults" aria-label="Resultados de búsqueda">
                    <p role="status">
                        {errorBusqueda ? 'No se pudo cargar la búsqueda. Borra el texto y vuelve a intentarlo.' :
                        productosBusqueda === null ? 'Buscando productos…' :
                        resultados.length === 0 ? 'No se encontraron productos para tu búsqueda.' :
                        `${resultados.length} productos encontrados`}
                    </p>
                    {!errorBusqueda && <div className="homeSearchGrid">
                        {resultados.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>}
                </section>
            } />
            <main className="mainContent">
                <div className="heroSection">
                    <h1>Potencia y Estilo para tu Vehículo</h1>
                    <p>Encuentra las mejores marcas en llantas y aros de alto rendimiento para llevar tu experiencia de conducción al siguiente nivel.</p>
                    <Link className="primaryButton" to="/llantas">Ver catálogo <img src="/design/arrow.svg" alt="" /></Link>
                </div>
                <div className="categoriesSection">
                    <div className="llantasCard">
                    <h2>Llantas</h2>
                    <p>Máximo agarre y durabilidad en cualquier terreno.</p>
                    <Link className="exploreButton" to="/llantas">Explorar</Link>
                    </div>
                    <div className="arosCard">
                    <h2>Aros</h2>
                    <p>Diseño superior y resistencia inigualable.</p>
                    <Link className="exploreButton" to="/aros">Explorar</Link>
                    </div>
                </div>
                {cargando && <p>...Cargando productos</p>}
                {error && <p>{error}</p>}
                <section className="featuredSection">
                    <div className="sectionHeading"><h2>Productos Destacados</h2><Link to="/llantas">Ver todos <img src="/design/arrow-small.svg" alt="" /></Link></div>
                    {!cargando && !error && destacados.length === 0 && (
                        <p role="status">No hay productos destacados disponibles.</p>
                    )}
                    <div className="productosDestacados">
                    {destacados.map((product)=>(<ProductCard key={product.id} product={product} />))}
                    </div>
                </section>
            </main>
            <Footer />
            
        </div>
    )
}

export default Home