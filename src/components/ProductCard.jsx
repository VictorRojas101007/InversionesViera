import whatsAppIcon from "../assets/whatsapp.svg";

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
    <div className="productCard">
      <img src={product.image || undefined} alt={nombre} />

      <div className="productDescription">
        <h3>{nombre}</h3>
        <p>Medida: {medida}</p>
        <p>{detalle}</p>

        <div className="buttonContainer">
          <a
            className="botonCotizar"
            href={enlaceWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={whatsAppIcon} alt="" />
            <span>Cotizar por WhatsApp</span>
          </a>
        </div>

        {esDueno && (
          <button type="button" onClick={() => onDelete(product)}>
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;