import { useState } from "react";
import { Link } from "react-router-dom";
import { productPath, productType, formatPR } from "../utils/productDetails.js";
import CopyProductButton from "./CopyProductButton.jsx";
import whatsappIcon from "../assets/whatsapp.svg";

const TELEFONO_WHATSAPP = "51937042895";

export function FotoProducto({ product, nombre }) {
  const [estado, setEstado] = useState("cargando");
  const esAro = product.categoria === "aro";
  const sinImagen = !product.image || estado === "error";

  return (
    <>
      <div className="productImage">
        {sinImagen ? (
          <span className="imagePending">Imagen no disponible</span>
        ) : (
          <>
            {estado === "cargando" && (
              <div className="cargaFoto" role="status">
                <span
                  className={esAro ? "ruedaCarga ruedaCarga--aro" : "ruedaCarga"}
                  aria-hidden="true"
                />
                <span>Cargando…</span>
              </div>
            )}

            <img
              className="fotoCatalogo"
              src={product.image}
              alt={
                product.imagenReferencial
                  ? `Imagen referencial de ${nombre}`
                  : nombre
              }
              style={{ opacity: estado === "lista" ? 1 : 0 }}
              onLoad={() => setEstado("lista")}
              onError={() => setEstado("error")}
            />
          </>
        )}

        {product.destacado && (
          <span className="productBadge">Destacado</span>
        )}

        {product.tipoTerreno && (
          <span className="terrainBadge">{product.tipoTerreno}</span>
        )}
      </div>

      {estado === "lista" && product.imagenReferencial && (
        <small className="imagenReferencial">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7v2" />
          </svg>
          <span>Imagen referencial</span>
        </small>
      )}
    </>
  );
}

function ProductCard({ product, esDueno, onDelete }) {
  const esLlanta = product.categoria === "llanta";
  const nombre =
    product.name || product.descripcion || product.marca || "Producto";
  const medida = product.medida || product.medidaAro;

  const especificaciones = esLlanta
    ? [
        ["Aplicación", product.aplicacion],
        ["Lonas", formatPR(product.pr)],
      ]
    : productType(product) === 'aro' ? [
        ["Diámetro", product.diametroAro],
        ["Ancho", product.anchoAro],
        ["Huecos", product.cantidadHuecos],
        ["Offset (ET)", product.et],
      ] : [["Tipo", product.tipoArticulo], ["Compatibilidad", product.compatibilidad]];

  const camposVisibles = especificaciones.filter(
    ([, valor]) => valor != null && valor !== ""
  );

  const mensaje = [
    "Hola, quiero cotizar este producto:",
    "",
    nombre,
    product.marca && `Marca: ${product.marca}`,
    medida && `Medida: ${medida}`,
    ...camposVisibles.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
    "",
    "¿Me confirman el precio y la disponibilidad?",
  ]
    .filter((linea) => linea != null)
    .join("\n");

  const enlaceWhatsApp =
    `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

  return (
    <article className={`productCard productCard--${product.categoria}`}>
      <Link className="productDetailLink" to={productPath(product)} aria-label={`Ver ${nombre}`}>
        <FotoProducto key={product.image} product={product} nombre={nombre} />
      </Link>

      <div className="productDescription">
        {product.marca && <p className="productBrand">{product.marca}</p>}
        <Link className="productDetailLink" to={productPath(product)}><h3>{nombre}</h3></Link>
        {medida && <p className="productMeasure">{medida}</p>}

        {camposVisibles.length > 0 && (
          <dl className="productSpecs">
            {camposVisibles.map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt>{etiqueta}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="buttonContainer">
          <Link className="viewProduct" to={productPath(product)}>Ver producto</Link>
          <a
            className="botonCotizar"
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={whatsappIcon} alt="" />
            <span>Cotizar por WhatsApp</span>
          </a>
        </div>

        {esDueno && (
          <CopyProductButton key={product.id} product={product} />
        )}

        {esDueno && onDelete && (
          <button type="button" onClick={() => onDelete(product)}>
            Borrar
          </button>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
