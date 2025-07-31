
# Sistema de Ventas para Bingo 2025

Este proyecto es un sistema de punto de venta (POS) robusto y moderno, diseñado específicamente para gestionar las ventas durante el evento "Bingo 2025". La aplicación incorpora un módulo de inteligencia artificial llamado "Molly Colgemelli" para mejorar la seguridad, la asistencia al cliente y el análisis de datos.

## Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [shadcn/ui](https://ui.shadcn.com/)
- **Inteligencia Artificial:** [Genkit (Google AI)](https://firebase.google.com/docs/genkit) con modelos Gemini.
- **Despliegue:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

---

## Características Principales

### 1. Punto de Venta (POS) para Cajeros
- Interfaz rápida e intuitiva optimizada para agilizar las ventas.
- Cálculo automático de subtotales y cambio.
- Soporte para pagos en Efectivo y Daviplata.
- Sistema de registro de devoluciones.

### 2. Autogestión para Padres (Daviplata)
- Una página pública donde los padres pueden seleccionar productos, pagar por adelantado con Daviplata y generar un código de referencia.
- Verificación rápida de códigos en caja para la entrega de productos/vales.
- Consulta de historial de compras por número de documento.

### 3. Dashboard de Administrador Avanzado
- Visualización de métricas clave en tiempo real: recaudación neta, ventas por método de pago, total de devoluciones.
- Gráficos interactivos para analizar las ventas por artículo y el rendimiento de las promociones.
- Desglose de ventas por cajero para evaluar el rendimiento.
- Historial detallado de ventas y devoluciones.

### 4. Gestión de Artículos y Cajeros (Usuarios)
- Panel para crear, editar y marcar artículos como "agotados".
- Sistema de gestión de usuarios (cajeros) con un control de permisos granular basado en roles.
Las contraseñas de los cajeros se almacenan en Supabase usando hashes generados con bcrypt.
### 5. Módulo de Inteligencia Artificial "Molly Colgemelli"
- **Análisis de Seguridad de Transacciones:** Una IA analiza cada transacción (tanto de cajeros como de Daviplata) para detectar patrones inusuales o potencialmente fraudulentos, alertando en los logs sin interrumpir las ventas rápidas.
- **Asistente de Chat para Padres:** Un chatbot de IA en la página de autogestión que responde preguntas sobre el proceso de compra y el evento, con la capacidad de que un administrador intervenga en la conversación en tiempo real.
- **Analista de Datos Virtual:** Una herramienta en el dashboard que permite a los administradores hacer preguntas en lenguaje natural sobre los datos de ventas (ej: "¿cuál es el producto más vendido?") o generar informes estratégicos completos con recomendaciones.

---

## Puesta en Marcha (Entorno Local)

Sigue estos pasos para ejecutar la aplicación en tu máquina local.

### 1. Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

### 2. Obtener el Código Fuente
Abre tu terminal y clona el repositorio del proyecto:
```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_DIRECTORIO>
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Configurar Variables de Entorno (¡Paso Crucial!)

Para que la aplicación funcione en tu entorno local, crea un archivo llamado `.env.local` en la **raíz del proyecto**. Usa el archivo `.env.example` como base y reemplaza sus marcadores con tus credenciales reales. La URL y las claves de Supabase deben obtenerse desde tu proyecto en [Supabase](https://supabase.com/).

**¡MUY IMPORTANTE!** Después de crear o modificar este archivo, **debes reiniciar completamente el servidor de desarrollo**. Detenlo con `Ctrl+C` y vuelve a ejecutar `npm run dev`.

En producción, estas variables deben almacenarse en **Google Secret Manager** y nunca dentro del repositorio.

#### ¿Dónde obtener la Clave de API de Gemini?

1.  **Ve a Google AI Studio**: Abre el siguiente enlace en tu navegador: [**makersuite.google.com/app/apikey**](https://makersuite.google.com/app/apikey).
2.  **Inicia Sesión**: Si no lo has hecho, inicia sesión con tu cuenta de Google.
3.  **Crea una Clave de API**: Haz clic en el botón **"Crear clave de API"**. Es posible que se te pida que crees un nuevo proyecto de Google Cloud si no tienes uno.
4.  **Copia tu Clave**: Una vez generada, cópiala al portapapeles.
5.  **Pégala en `.env.local`**: Regresa a tu editor de código y pega la clave como el valor de la variable `GEMINI_API_KEY`.

### 5. Ejecutar la Aplicación
Una vez instaladas las dependencias, inicia el servidor de desarrollo.

```bash
npm run dev
```

La aplicación estará disponible en la URL que indique la terminal (generalmente `http://localhost:9002`).

---

## Despliegue en Firebase App Hosting (Entorno de Producción)

Este proyecto está configurado para ser desplegado en **Firebase App Hosting**. Para que funcione en producción, las claves secretas **NO** deben estar en el código. Debes configurarlas como "secretos" en Google Cloud.

**El archivo `.env.local` es solo para desarrollo local y NO se utiliza en producción.**

### Configuración de Secretos en Google Cloud

1.  Ve a tu proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2.  En el menú de navegación, busca **Seguridad > Secret Manager**.
3.  Haz clic en **Crear Secreto** y crea los siguientes secretos si aún no existen (usa los mismos nombres):
    - **`NEXT_PUBLIC_SUPABASE_URL`**: La URL pública de tu proyecto de Supabase.
    - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Tu clave anónima pública de Supabase.
    - **`SUPABASE_SERVICE_ROLE_KEY`**: Tu clave de rol de servicio (secreta) de Supabase.
    - **`GEMINI_API_KEY`**: Tu clave de API de Gemini.

### Asignar Permisos a los Secretos

1.  Una vez creados los secretos, debes dar permiso a Firebase App Hosting para que los lea.
2.  Ve a la página principal de **Secret Manager**.
3.  Marca la casilla de los secretos que acabas de crear.
4.  En el panel de la derecha (sección "Permisos"), haz clic en **Añadir principal**.
5.  En el campo **Nuevos principales**, pega la siguiente cuenta de servicio (reemplazando `<PROJECT_NUMBER>` con el número de tu proyecto de Google Cloud): `service-<PROJECT_NUMBER>@gcp-sa-apphosting.iam.gserviceaccount.com`
6.  Asigna el rol **Descriptor de acceso a secretos de Secret Manager**.
7.  Haz clic en **Guardar**.

### Realizar el Despliegue

Con los secretos configurados y los permisos asignados, puedes iniciar el despliegue desde tu terminal.

```bash
firebase apphosting:backends:deploy
```
Sigue las instrucciones de la CLI para seleccionar tu backend y completar el proceso. Una vez finalizado, tu aplicación estará publicada y será completamente funcional.

## Convención de Usernames

Los nombres de usuario no distinguen entre mayúsculas y minúsculas. Al crear, actualizar o iniciar sesión, la aplicación transforma automáticamente el valor ingresado a **minúsculas**. Si importas usuarios desde otro sistema, asegúrate de que los usernames estén en minúsculas para evitar duplicados o problemas de autenticación.

## Soluci\u00f3n de Errores Comunes

### "La acci\u00f3n de diagn\u00f3stico fall\u00f3 catastr\u00f3ficamente"

Este mensaje suele aparecer cuando las variables de entorno de **Supabase** no est\u00e1n configuradas o no se est\u00e1 leyendo el archivo `.env.local`. Aseg\u00farate de tener definidos `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (o alguno de sus alias) antes de iniciar la aplicaci\u00f3n.

Si acabas de crear o modificar `.env.local`, reinicia el servidor de desarrollo con `Ctrl+C` y luego ejecuta nuevamente:

```bash
npm run dev
```
