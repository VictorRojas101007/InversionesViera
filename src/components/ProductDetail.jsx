import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import Header from './Header.jsx';
import Footer from './footer.jsx';
import { FotoProducto } from './ProductCard.jsx';
import { productName, productSpecs, productType, typeLabels, quoteLink, stockLabel } from '../utils/productDetails.js';
import './ProductDetail.css';
import whatsappIcon from "../assets/whatsapp.svg";


const guidance = {
  llanta: 'Consulta con un asesor la medida y aplicación adecuadas para tu vehículo.',
  aro: 'Confirma la medida, cantidad de huecos y compatibilidad con tu vehículo.',
  faro: 'Indícanos el modelo y año de tu vehículo, y si necesitas el lado derecho o izquierdo.',
  otro: 'Compártenos la referencia o medida que necesitas para confirmar la compatibilidad.',
  servicio: 'Cuéntanos qué trabajo necesitas y el tipo de aro o vehículo para coordinar la atención.',
};

export default function ProductDetail({ category }) {
  const { productId } = useParams();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    window.scrollTo(0, 0);
    getDoc(doc(db, 'productos', productId)).then((snapshot) => {
      if (!active) return;
      const product = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null;
      const correctCategory = product && (category === 'llantas' ? product.categoria === 'llanta' : ['aro', 'accesorio_servicio', 'faro', 'accesorio'].includes(product.categoria));
      setResult({ id: productId, attempt, product: product?.publicado === true && correctCategory ? product : null });
    }).catch((error) => {
      if (active) setResult(error.code === 'permission-denied'
        ? { id: productId, attempt, product: null }
        : { id: productId, attempt, error: true });
    });
    return () => { active = false; };
  }, [productId, category, attempt]);

  const ready = result?.id === productId && result.attempt === attempt;
  const product = ready ? result.product : null;
  const type = product ? productType(product) : 'llanta';
  const name = product ? productName(product) : '';
  useEffect(() => {
    const previous = document.title;
    if (name) document.title = `${name} | Inversiones Viera`;
    return () => { document.title = previous; };
  }, [name]);

  return <>
    <Header mostrarBuscador={false} />
    <main className={`detailPage detailPage--${type}`}>
      <div className="detailSubheader">
        <div className="detailBreadcrumb"><Link to={`/${category}`}><img src="/design/detail/back.svg" alt="" />Catálogo de {category}</Link>{product && <span>ID: {product.id}</span>}</div>
        <nav className="detailCategories" aria-label="Catálogos"><Link to="/llantas" className={category === 'llantas' ? 'selected' : ''}>Llantas</Link><Link to="/aros" className={category === 'aros' ? 'selected' : ''}>Aros y accesorios</Link></nav>
      </div>
      {!ready ? <div className="detailState" role="status">Cargando producto…</div> : result.error ? <div className="detailState" role="alert"><h1>No pudimos cargar el producto</h1><p>Revisa tu conexión y vuelve a intentarlo.</p><button onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div> : !product ? <div className="detailState"><h1>Producto no disponible</h1><p>Este producto no está publicado o ya no se encuentra en el catálogo.</p><Link to={`/${category}`}>Volver al catálogo</Link></div> : <>
        <article className="detailHero">
          <div className="detailPhoto"><FotoProducto key={`${product.id}-${product.image}`} product={product} nombre={name} /><span className="detailType">{typeLabels[type]}</span></div>
          <div className="detailSummary">
            <div className="detailMeta">{product.marca && <span>Marca: {product.marca}</span>}<span className="detailStock">{stockLabel(product)}</span></div>
            <h1>{name}</h1>
            {(product.medida || product.medidaAro) && <p className="detailMeasure">{product.medida || product.medidaAro}</p>}
            {product.descripcion && product.descripcion !== name && <p className="detailDescription">{product.descripcion}</p>}
            <p className="detailDescription">{guidance[type]}</p>
            <a className="detailQuote" href={quoteLink(product)} target="_blank" rel="noopener noreferrer"><img src={whatsappIcon} alt="" /><span>{type === 'servicio' ? 'Consultar por WhatsApp' : 'Cotizar por WhatsApp'}</span></a>
            <p className="detailAdvisor">Atención personalizada con un asesor de Inversiones Viera</p>
          </div>
        </article>
        <section className="detailSpecifications" aria-labelledby="specifications-title">
          <div className="detailSectionHeading"><h2 id="specifications-title">{type !== 'llanta' && <img src="/design/detail/specs.svg" alt="" />}Ficha técnica</h2><span>Datos del inventario</span></div>
          <dl>{[...productSpecs(product), ['Disponibilidad', stockLabel(product)], ['Código interno', product.id]].map(([label, value]) => <div className="detailSpecRow" key={label}><dt>{label}</dt><dd>{label === 'Disponibilidad' ? <mark>{value}</mark> : value}</dd></div>)}</dl>
        </section>
        {(type === 'faro' || type === 'otro' || type === 'servicio') && <aside className="detailAssistance"><h2>{type === 'servicio' ? 'Coordinemos tu atención' : 'Encuentra la pieza adecuada'}</h2><p>{guidance[type]}</p><a href={quoteLink(product)} target="_blank" rel="noopener noreferrer">Hablar con un asesor <span aria-hidden="true">↗</span></a></aside>}
      </>}
    </main>
    <Footer />
  </>;
}
