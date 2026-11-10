import whatsappIcon from "../assets/whatsapp.svg";
import { useState } from "react";
import { NavLink } from "react-router-dom";

const enlaces = [
  { to: "/", label: "Inicio", icon: "/design/home.svg" },
  { to: "/llantas", label: "Llantas", icon: "/design/tires.svg" },
  { to: "/aros", label: "Aros", icon: "/design/rims.svg" },
];

function Header({ onBuscar, resultadosBusqueda }) {
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  function cambiarTexto(e) {
    const valor = e.target.value;
    setTexto(valor);
    onBuscar?.(valor);
  }

  return (
    <>
      <header className="siteHeader">
        <details className="mobileMenu">
          <summary aria-label="Abrir navegación"><span /><span /><span /></summary>
          <nav aria-label="Menú principal">
            {enlaces.map(({ to, label }) => <NavLink key={to} to={to} end>{label}</NavLink>)}
          </nav>
        </details>
        <NavLink className="brand" to="/">Inversiones Viera</NavLink>
        <nav className="desktopNav" aria-label="Navegación principal">
          {enlaces.map(({ to, label }) => <NavLink key={to} to={to} end>{label}</NavLink>)}
          <a href="https://wa.me/51949638333" target="_blank" rel="noopener noreferrer"><img src={whatsappIcon} alt="" />Cotizar</a>
        </nav>
        <button
          className="searchToggle"
          type="button"
          aria-label="Buscar productos"
          aria-expanded={buscadorAbierto}
          aria-controls="buscar-productos"
          onClick={() => setBuscadorAbierto((abierto) => !abierto)}
        >
          <img src="/design/search.svg" alt="" />
        </button>
        {buscadorAbierto && (
          <div className={`searchPanel${resultadosBusqueda ? " searchPanel--results" : ""}`}>
            <input
              id="buscar-productos"
              aria-label="Buscar productos"
              type="search"
              placeholder="Buscar productos..."
              value={texto}
              onChange={cambiarTexto}
            />
            {texto.trim() && resultadosBusqueda}
          </div>
        )}
      </header>
      <nav className="bottomNav" aria-label="Navegación móvil">
        {enlaces.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end><img src={icon} alt="" /><span>{label}</span></NavLink>
        ))}
        <a href="https://wa.me/51949638333" target="_blank" rel="noopener noreferrer"><img src={whatsappIcon} alt="" /><span>Cotizar</span></a>
      </nav>
    </>
  );
}

export default Header;
