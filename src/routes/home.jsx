
import Footer from '../components/footer.jsx'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import obtenerProductosDestacados from '../services/productosServices.js'



function Home() {
    const [destacados, setDestacados] = useState([]);
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


    return (
        <div>
            <Header />
            <div className="mainContent">
                <div className="heroSection">
                    <h1>Potencia y Estilo para tu carro</h1>
                    <p>Encuentra las mejores marcas en llantas y aros de alto rendimiento para llevar tu experiencia de conducción al siguiente nivel.</p>
                    <Link to="/llantas">Ver catálogo</Link>
                </div>
                <div className="categoriesSection">
                    <div className="llantasCard">
                    <h2>Llantas</h2>
                    <p>Máximo agarre y durabilidad en cualquier terreno.</p>
                    <button>Explorar</button>
                    </div>
                    <div className="arosCard">
                    <h2>Aros</h2>
                    <p>Diseño superior y resistencia inigualable.</p>
                    <button>Explorar</button>
                    </div>
                </div>
                {cargando && <p>...Cargando productos</p>}
                {error && <p>{error}</p>}
                <div>
                    <h2>Productos Destacados</h2>
                    <div className="productosDestacados">
                    {destacados.map((product)=>(<ProductCard key={product.id} product={product} />))}
                    </div>
                </div>
            </div>
            <Footer />
            
        </div>
    )
}

export default Home