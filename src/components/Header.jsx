import { useState } from "react";
import search from "../assets/search.svg";

function Header({ onBuscar }) {
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  function cambiarTexto(e) {
    const valor = e.target.value;
    setTexto(valor);
    onBuscar?.(valor);
  }

  return (
    <header>
      <h1>Inversiones Viera</h1>

      <nav>
        <ul>
          <li>Inicio</li>
          <li>Llantas</li>
          <li>Aros</li>
        </ul>
      </nav>

      <button
        type="button"
        aria-label="Buscar productos"
        onClick={() => setBuscadorAbierto((abierto) => !abierto)}
      >
        <img src={search} alt="" />
      </button>

      {buscadorAbierto && (
        <input
          type="search"
          placeholder="Buscar productos..."
          value={texto}
          onChange={cambiarTexto}
        />
      )}
    </header>
  );
}

export default Header;