import './App.css'
import {Routes, Route} from 'react-router-dom'
import Home from './routes/home.jsx'
import ProductCategory from './components/ProductCategory.jsx'
import Login from './components/login.jsx'
import { useState, useEffect } from 'react'
import { auth } from './firebase.js'
import { onAuthStateChanged } from 'firebase/auth'


const UID = "8XXQbDdqyEWSqorZipJDTFFQ4w12"


function App() {

    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);

    useEffect(() => {
    const cancelarObservador = onAuthStateChanged(auth, (usuarioActivo) => {
      setUsuario(usuarioActivo);
      setCargandoSesion(false);
    });

    return cancelarObservador;
  }, []);

  const esDueño = usuario?.uid === UID;

  if (cargandoSesion) {
    return <p>Comprobando sesión...</p>;
  }


  return (
    <Routes>

      <Route path='*' element={<Home/>} />
      <Route path='/llantas' element={<ProductCategory category={"llantas"} esDueno={esDueño} />} />  
      <Route path='/aros' element={<ProductCategory category={"aros"} esDueno={esDueño} />} />  
      <Route path='/login'  element={<Login  esDueno={esDueño} />}  />  

    </Routes>
  )
}

export default App
