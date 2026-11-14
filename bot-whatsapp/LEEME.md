# Inversiones Viera · Bot de cotizaciones desde cero

## 1. Instala la carpeta y prueba los precios
Descomprime el ZIP. Mueve la carpeta bot-whatsapp junto a src y package.json de InversionesViera. En VS Code abre la carpeta InversionesViera y elige Terminal → Nueva terminal. Ejecuta:

    cd bot-whatsapp
    node -v
    npm run demo
    npm test

Usa Node 24 (tu versión anterior 24.18 sirve). Todo el ejemplo usa módulos incluidos en Node. El demo usa datos ficticios y funciona sin cuentas ni contraseñas. Verás 2 por S/ 560 y 4 por S/ 1.000. Los comandos restantes se ejecutan desde bot-whatsapp.

## 2. Configura una llanta del inventario
Acuerda con el dueño el mínimo, la moneda, el stock disponible y el precio final que puede ofrecer a clientes. Este ejemplo usa soles y aplica el descuento por unidades del mismo producto. No suma modelos diferentes.

En Firebase Console → tu proyecto → Firestore Database → Datos → productos, selecciona una llanta ya publicada. Copia su ID exacto. Pulsa Agregar campo para cada uno: precioUnidad (number), precioMayorista (number), minimoMayorista (number). Usa importes autorizados en el inventario real. Para ensayar con 280, 250 y 4, utiliza un proyecto de pruebas o el demo. Añade medidaBusqueda (string). Si medida es 265/70 R16, escribe 265/70R16. Para un aro con medidaAro 16 x 6.00, escribe 16X6.00. Conserva publicado (boolean true) y categoria (string llanta o aro). Las búsquedas por medida encuentran documentos con esa medida normalizada. El lookup por código funciona sin medidaBusqueda.

El ejemplo consulta por REST con las reglas de lectura pública que usa tu catálogo. Cada campo dentro de un producto publicado queda disponible para quien pueda leer el documento. Usa este diseño si los precios pueden ser públicos. Si el dueño necesita tarifas reservadas, guárdalas en una colección privada y adapta el lector en datos.js con autenticación de servidor antes de usarlas. No cargues precios de costo como precios de venta.

## 3. Configura el entorno local y Gemini
En la terminal:

    cp variables.ejemplo .env

Abre bot-whatsapp/.env en VS Code. Completa FIREBASE_PROJECT_ID con el ID de Configuración del proyecto → General en Firebase. CONTACTO_ASESOR es el teléfono o enlace de una persona que realmente puede atender; el bot se lo muestra al cliente cuando escribe «asesor». Usa un destino distinto al propio bot.

En https://aistudio.google.com/apikey entra con tu cuenta, elige o crea un proyecto para la API y crea una clave. Pégala en GEMINI_API_KEY. En AI Studio elige un modelo de texto disponible con salida JSON estructurada y copia el ID técnico en GEMINI_MODEL (por ejemplo gemini-2.5-flash-lite solo si aparece disponible). La clave y la cuota corresponden al proyecto seleccionado. Prueba primero con mensajes ficticios. Revisa las condiciones de tratamiento de datos del nivel elegido antes de usar mensajes reales.

    npm run probar

Escribe Código: seguido del ID real, por ejemplo «Código: llanta_001», sin comillas. Debe responder con el nombre y preguntar la cantidad. Después escribe «un par» y «¿y si llevo cuatro?». Por último intenta «busco llanta 265/70 R16» usando tu medida real. Escribe salir para terminar. La búsqueda ofrece hasta cinco coincidencias; el cliente puede elegir copiando la línea Código. El ejemplo conserva el último producto seleccionado. Si una consulta es ambigua, pide tipo y medida juntos. Las variantes de escritura que cambian dígitos o puntuación pueden requerir ampliar la normalización.

Si falla el código, verifica proyecto, ID, reglas y publicado como booleano. Si falla solo «un par», revisa la clave, el modelo y la cuota de Gemini. Si falla solo buscar por medida, revisa categoria y medidaBusqueda. La consulta usa igualdad en los campos.

## 4. Prepara el WhatsApp de prueba
En https://developers.facebook.com/apps/ crea una app para uso empresarial y elige el caso de uso de WhatsApp o agrega el producto WhatsApp. Sigue el asistente de la cuenta empresarial. Abre WhatsApp → Configuración de la API (API Setup). Selecciona el número de prueba de Meta, agrega tu celular como destinatario y verifica el código. Envía desde el panel el mensaje de prueba. Confirma que llegó.

En bot-whatsapp/.env guarda los siguientes valores:
- PHONE_NUMBER_ID: el identificador del número de prueba, distinto del teléfono visible y del ID de cuenta de WhatsApp (WABA).
- WHATSAPP_TOKEN: token de acceso de prueba del panel. Si expira, genera otro y actualízalo también en el alojamiento.
- GRAPH_VERSION: versión que aparece en la URL de ejemplo de Meta, incluida la v (formato vNN.N).
- META_APP_SECRET: App settings → Basic → App secret de la misma aplicación.
- VERIFY_TOKEN: una cadena aleatoria que eliges tú. En Mac puedes generarla ejecutando openssl rand -hex 32. Copia el mismo valor en el panel de webhooks.
- SQLITE_PATH: deja ./bot.sqlite para la prueba local.

Ejecuta npm start y abre http://localhost:3000/salud. Debe decir OK. Detén el servidor con Ctrl+C. El archivo SQLite guarda el contexto y la cola de entrada. Usa una sola instancia del proceso. El token de Meta, la clave Gemini, el secreto de aplicación y tu archivo .env son privados. No uses variables VITE_ para ellos.

## 5. Publica el servidor de prueba en Render
Desde la raíz del repositorio ejecuta git check-ignore -v bot-whatsapp/.env y revisa git status. Sube solo los archivos de código y variables.ejemplo. Si también tienes en la raíz una clave de administración de Firebase del importador, comprueba que su nombre real, incluida una posible extensión doble, esté ignorado y fuera de los archivos que vas a subir. Este bot no la necesita.

En Render → New → Web Service conecta tu repositorio. Selecciona Node, Root Directory bot-whatsapp, Build Command npm install --omit=dev y Start Command npm start. En Environment añade las mismas variables del .env con sus valores, una por una. El puerto lo asigna Render. Despliega y abre https://TU-SERVICIO.onrender.com/salud. Debe mostrar OK.

La instancia gratuita sirve para probar: se duerme por inactividad y su disco es temporal. Para la tienda, si eliges Render, usa una instancia activa y un disco persistente montado, por ejemplo, en /var/data; cambia SQLITE_PATH a /var/data/bot.sqlite. Incluye el disco en el presupuesto. La configuración local .env no se sube con git; el panel de Render guarda las variables del servicio.

## 6. Haz que Meta entregue los mensajes
En el panel de tu app de Meta, WhatsApp → Configuración → Webhooks (o el producto Webhooks → WhatsApp Business Account), edita la URL de devolución:
- Callback URL: https://TU-SERVICIO.onrender.com/webhook
- Verify token: el mismo VERIFY_TOKEN de Render.

Pulsa Verificar y guardar. Suscribe el campo messages del objeto whatsapp_business_account. Verifica también que la app esté suscrita a la cuenta de WhatsApp Business que posee el número de prueba. Si la interfaz no la ha suscrito, usa en la colección oficial de Meta la acción «Subscribe to your WABA» con tu WABA ID y un token con whatsapp_business_management. Son dos pasos diferentes: campo messages y suscripción de app a cuenta.

Desde tu teléfono verificado responde al número de prueba «Código: TU_ID». Si llega la pregunta de cantidad, contesta «un par» y luego «¿y si llevo cuatro?». Si Meta verifica la URL pero el bot no contesta, comprueba campo messages, suscripción WABA, PHONE_NUMBER_ID, token vigente y los logs del servicio. Al recibir un evento firmado, el servidor lo guarda antes de contestarle a Meta, ignora los estados de entrega y responde al cliente en segundo plano. Los eventos repetidos con el mismo ID se reconocen en SQLite. Una interrupción justo después de enviar a Meta puede producir un reenvío. Tras cinco fallos la tarea queda marcada fallido; revisa los logs si ocurre.

## 7. Conecta la tarjeta de tu web
En ProductCard.jsx añade dentro del mensaje de cotización una línea propia, debajo del nombre:

    Código: ${product.id}

Usa el ID de documento que ya te devuelve Firestore. Para probar desde la web, cambia TELEFONO_WHATSAPP al número de prueba solo en tu entorno de desarrollo. Abre una tarjeta, pulsa Cotizar, revisa el código y pulsa Enviar en WhatsApp. Repite con una llanta y con un aro. El bot responde al mensaje enviado.

## 8. Antes de abrirlo a clientes
Prueba con el dueño: dos unidades, una menos que el mínimo, el mínimo exacto, stock insuficiente, estadoStock verificar, precio ausente, dos modelos con la misma medida, un código inexistente, «aro 16» y «asesor». Completa luego precioUnidad, precioMayorista, minimoMayorista y medidaBusqueda en el resto del inventario que quieras cotizar. Usa el mínimo acordado para cada modelo. Añade esos campos al formulario del dueño para los productos nuevos. Antes de cotizar datos reales revisa que stock represente disponibilidad que la tienda puede comprometer; el bot no reserva ni descuenta unidades.

En el administrador de WhatsApp vincula un número autorizado para producción, completa las verificaciones que pida Meta y configura un token de usuario del sistema con acceso al activo y permiso de mensajería. Si el dueño ya usa su número en WhatsApp Business móvil, comprueba que su cuenta y el método de alta admitan coexistencia antes de migrar ese número. Actualiza PHONE_NUMBER_ID, WHATSAPP_TOKEN y la suscripción WABA de producción. Cambia TELEFONO_WHATSAPP en React al número definitivo y vuelve a publicar la web. Haz una prueba desde un segundo teléfono. Configura alertas de consumo y revisa la atención humana y el manejo de mensajes conforme a la política de WhatsApp. Este ejemplo atiende mensajes entrantes de texto.

Documentación:
https://whatsappbusiness.com/es-la/developers/developer-hub/
https://developers.facebook.com/documentation/business-messaging/whatsapp/overview
https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api
https://firebase.google.com/docs/firestore/use-rest-api
https://firebase.google.com/docs/firestore/security/rules-fields
https://ai.google.dev/gemini-api/docs/structured-output
https://ai.google.dev/gemini-api/docs/pricing
https://render.com/docs/deploy-node-express-app
https://render.com/docs/disks
