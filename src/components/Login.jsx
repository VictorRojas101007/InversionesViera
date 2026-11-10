import { useState } from 'react'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './footer.jsx'

function Login ({ esDueno }) {

    const [email, setEmail]= useState('');
    const [password, setPassword]= useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function iniciarSesión(e){
        e.preventDefault();
        setError('');

        try{
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/llantas');
            console.log('Inicio de sesión exitoso');
            console.log('Usuario:', auth.currentUser , esDueno);
        }catch{
            setError('Error al iniciar sesión');
            console.error('Error al iniciar sesión');
        }
    }

    return (
        <div className="loginPage">
            <Header />
            <main className="loginMain">
                <section className="loginIntro" aria-labelledby="login-title">
                    <span className="loginEyebrow">Inversiones Viera</span>
                    <h1 id="login-title">Todo listo para<br />seguir avanzando.</h1>
                    <p>Accede a tu cuenta para administrar los productos de tu catálogo.</p>
                    <Link className="loginBack" to="/">← Volver al inicio</Link>
                </section>
                <section className="loginCard" aria-labelledby="login-form-title">
                    <span className="loginEyebrow">Administración</span>
                    <h2 id="login-form-title">Iniciar sesión</h2>
                    <p className="loginDescription">Ingresa con tu correo y contraseña.</p>
                    <form className="loginForm" onSubmit={iniciarSesión}>
                        <label htmlFor="login-email">Correo electrónico</label>
                        <input
                            id="login-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            placeholder="tu@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <label htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Ingresa tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {error && <p className="loginError" role="alert">{error}</p>}
                        <button className="primaryButton" type="submit">Ingresar <img src="/design/arrow.svg" alt="" /></button>
                    </form>
                    <Link className="loginCatalogLink" to="/llantas">Ver catálogo de productos →</Link>
                </section>
            </main>
            <Footer />
        </div>
    );

}

export default Login