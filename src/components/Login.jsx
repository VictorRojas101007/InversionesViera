import { useState } from 'react'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

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

    return(
        <form onSubmit={iniciarSesión}>
            <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
            <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e)=> setPassword(e.target.value)}
            required
            />
            <button type="submit">
                Login
            </button>
            {error && <p>{error}</p>}
        </form>


    )
}

export default Login