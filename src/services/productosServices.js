import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    query,
    where
} from "firebase/firestore";
import { db } from "../firebase.js";


export async function agregarProducto(datos){
    const referencia = await addDoc(collection(db, "productos"), datos)
    return referencia.id;
}

export async function eliminarProducto(productoId){
    await deleteDoc(doc(db, "productos" ,productoId))
}

export  default async function obtenerProductosDestacados(categoria, cantidad){
    const consulta = query(
        collection(db, "productos"),
        where("categoria", "==", categoria),
        where("publicado", "==", true),
        where("destacado", "==", true),
        limit(cantidad)
    );

    const resultado = await getDocs(consulta);
    
    return resultado.docs.map((doc)=>({
        ...doc.data(),
        id: doc.id
    }));
}