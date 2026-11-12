import whatsappIcon from "../assets/whatsapp.svg";
import { useState } from "react";
const TELEFONO_WHATSAPP = "51949638333"; 

function ProductCard({ product, esDueno, onDelete }) {


  const [urlFallida, setUrlFallida] = useState(null);
  const mostrarImagen = Boolean(product.image) && product.image !== urlFallida;
  const nombre =
    product.name || product.descripcion || product.marca || "producto";

  const medida = product.medida || product.medidaAro || "No especificada";

  const detalle =
    product.categoria === "llanta"
      ? `PR: ${product.pr ?? "No especificado"}`
      : `Ancho: ${product.anchoAro ?? "No especificado"}`;

  const mensaje = `Hola, quiero cotizar este producto:

${nombre}
Marca: ${product.marca || "No especificada"}
Medida: ${medida}
${detalle}

¿Me confirman el precio y la disponibilidad?`;

  const enlaceWhatsApp =
    `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

  return (
    <article className={`productCard productCard--${product.categoria}`}>
      <div className="productImage">
  {mostrarImagen ? (
    <>
      <img
        src={product.image}
        alt={product.imagenReferencial ? `Imagen referencial de ${nombre}` : nombre}
        onError={() => setUrlFallida(product.image)}
      />

    </>
  ) : (
    <span className="imagePending">Imagen no disponible</span>
  )}

  {product.destacado && <span className="productBadge">Destacado</span>}

  {product.tipoTerreno && (
    <span className="terrainBadge">{product.tipoTerreno}</span>
  )}
</div>

      {mostrarImagen && product.imagenReferencial && (
        <small className="imagenReferencial">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7v2" />
          </svg>
          <span>Imagen referencial</span>
        </small>
      )}

      <div className="productDescription">
        <p className="productBrand">{product.marca}</p>
        <h3>{nombre}</h3>
        <p className="productMeasure">{medida}</p>
        <dl className="productSpecs">
          <div><dt>{product.categoria === "llanta" ? "Aplicación" : "Diámetro"}</dt><dd>{product.categoria === "llanta" ? (product.aplicacion || "—") : (product.diametroAro || "—")}</dd></div>
          <div><dt>{product.categoria === "llanta" ? "Lonas" : "Ancho"}</dt><dd>{product.categoria === "llanta" ? `${product.pr ?? "—"} PR` : (product.anchoAro || "—")}</dd></div>
          {product.categoria === "aro" && <>
            <div><dt>Huecos</dt><dd>{product.cantidadHuecos || "—"}</dd></div>
            <div><dt>Offset (ET)</dt><dd>{product.et || "—"}</dd></div>
          </>}
        </dl>

        <div className="buttonContainer">
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
          <button type="button" onClick={() => onDelete(product)}>
            Borrar
          </button>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
