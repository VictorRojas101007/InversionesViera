const TELEFONO_WHATSAPP = "51949638333"; // Reemplazar por el número real

function ProductCard({ product, esDueno, onDelete }) {
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
        {product.image ? <img src={product.image} alt={nombre} /> : <span className="imagePending">Imagen no disponible</span>}
        {product.destacado && <span className="productBadge">Destacado</span>}
        {product.tipoTerreno && <span className="terrainBadge">{product.tipoTerreno}</span>}
      </div>

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
            <img src="/design/chat.svg" alt="" />
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