import { useState } from 'react';
import { productName, productShareText } from '../utils/productDetails.js';

export default function CopyProductButton({ product }) {
  const [estadoCopia, setEstadoCopia] = useState('');
  const [textoManual, setTextoManual] = useState('');

  async function copiarInformacion() {
    const texto = productShareText(product, window.location.origin);
    setEstadoCopia('copiando');
    setTextoManual('');
    try {
      await navigator.clipboard.writeText(texto);
      setEstadoCopia('copiado');
    } catch {
      setTextoManual(texto);
      setEstadoCopia('error');
    }
  }

  const esLlanta = product.categoria === 'llanta';
  const nombre = productName(product);

  return (
          <div className="productCopy">
            <button className="copyProductButton" type="button" onClick={copiarInformacion} disabled={estadoCopia === 'copiando'}>
              {estadoCopia === 'copiando' ? 'Copiando…' : `Copiar información ${esLlanta ? 'de la llanta' : 'del producto'}`}
            </button>
            <p className="productCopyStatus" role="status">
              {estadoCopia === 'copiado' && 'Información copiada. Ya puedes pegarla en tu mensaje.'}
              {estadoCopia === 'error' && 'No se pudo copiar automáticamente. Selecciona y copia el texto de abajo.'}
            </p>
            {textoManual && (
              <textarea aria-label={`Información para compartir: ${nombre}`} readOnly value={textoManual} rows={7} onFocus={(event) => event.target.select()} />
            )}
          </div>
  );
}
