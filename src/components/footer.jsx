import whatsappIcon from "../assets/whatsapp.svg";
function Footer() {
    return (
        <>
        <footer>
            <h1>Inversiones Viera</h1>
            <nav>
                <ul>
                    <li> <a href="https://www.facebook.com/Inversionesviera" target="_blank" rel="noopener noreferrer">Facebook</a> </li>
                    <li> <a href="https://wa.me/949638333" target="_blank" rel="noopener noreferrer"><img src={whatsappIcon} alt="" />WhatsApp</a> </li>
                    <li> <a href="https://www.google.com/maps/place/Llantas+Inversiones+Viera/@-8.0895775,-79.0378974,19.67z/data=!4m6!3m5!1s0x91ad3d11aa292657:0x378fd16691e53a74!8m2!3d-8.0896234!4d-79.0381089!16s%2Fg%2F11g_x6hkpl?entry=ttu&g_ep=EgoyMDI2MTEwMy4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer">Ubicación</a> </li>
                </ul>
            </nav>
            <p>© 2026 INVERSIONES VIERA. Todos los derechos reservados.</p>
        </footer>
        <a className="floatingWhatsapp" href="https://wa.me/51949638333" target="_blank" rel="noopener noreferrer" aria-label="Cotizar por WhatsApp"><img src={whatsappIcon} alt="" /></a>
        </>
    )
}

export default Footer;