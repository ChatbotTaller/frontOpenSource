# Frontend Open Source - Asistente Conversacional Taller Reyes Polo

Este repositorio contiene el frontend del sistema **Asistente Conversacional Integrado con Agentes de Voz**, desarrollado para el **Taller Reyes Polo** como parte del proyecto de Capstone Project / Taller Integrador.

El frontend fue desarrollado con **Angular** y tiene como finalidad brindar una interfaz web para clientes y administradores. Permite la identificación del cliente mediante DNI, el acceso al chatbot, la interacción por texto y voz, la visualización del panel administrativo, la gestión de citas, el análisis de métricas y la comunicación con el backend API REST.

---

## Descripción general del proyecto

El sistema frontend permite que los usuarios interactúen con el asistente conversacional del Taller Reyes Polo desde un navegador web. A través de esta aplicación, los clientes pueden identificarse, seleccionar un modo de atención, conversar con el chatbot, realizar consultas, solicitar citas y utilizar funcionalidades de voz.

Asimismo, el frontend incluye un panel administrativo que permite visualizar citas, modificar estados, consultar métricas y exportar información. Este panel está protegido mediante autenticación y se comunica con el backend para obtener y actualizar la información registrada.

El frontend se conecta con el backend desarrollado en Node.js y Express, el cual procesa los mensajes, gestiona la lógica conversacional, almacena información en base de datos y se integra con servicios externos.

---

## Tecnologías utilizadas

- Angular
- TypeScript
- HTML
- CSS
- Angular Router
- Angular Guards
- Angular Services
- HTTP Client
- Chart.js
- XLSX
- LiveKit Client
- Retell Client
- Web Speech API
- LocalStorage
- Vercel para despliegue frontend

---

## Estructura del proyecto

```text
chatbottaller-frontopensource/
├── README.md
├── angular.json
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.spec.json
├── .editorconfig
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css
    └── app/
        ├── app.component.css
        ├── app.component.html
        ├── app.component.ts
        ├── app.config.ts
        ├── app.routes.ts
        ├── core/
        │   ├── guards/
        │   │   ├── auth.guard.ts
        │   │   └── cliente-auth.guard.ts
        │   └── services/
        │       ├── admin.service.ts
        │       ├── chatbot.service.ts
        │       └── dni.service.ts
        └── features/
            ├── admin/
            │   ├── admin.component.css
            │   ├── admin.component.html
            │   └── admin.component.ts
            ├── chat/
            │   ├── chat.component.css
            │   ├── chat.component.html
            │   └── chat.component.ts
            ├── chat-selector/
            │   ├── chat-selector.component.css
            │   ├── chat-selector.component.html
            │   └── chat-selector.component.ts
            ├── dni-login/
            │   ├── dni-login.component.css
            │   ├── dni-login.component.html
            │   └── dni-login.component.ts
            ├── login/
            │   ├── login.component.css
            │   ├── login.component.html
            │   └── login.component.ts
            └── metricas/
                ├── metricas.component.css
                ├── metricas.component.html
                ├── metricas.component.ts
                └── metricas.service.ts
```

---

## Descripción de carpetas y archivos principales

| Carpeta o archivo | Descripción |
|---|---|
| `README.md` | Documento de descripción técnica del frontend. |
| `angular.json` | Archivo de configuración principal del proyecto Angular. |
| `package.json` | Archivo donde se definen dependencias, scripts y configuración del proyecto. |
| `tsconfig.json` | Archivo de configuración general de TypeScript. |
| `src/index.html` | Archivo HTML principal donde se carga la aplicación Angular. |
| `src/main.ts` | Punto de entrada principal de la aplicación. |
| `src/styles.css` | Archivo de estilos globales del frontend. |
| `src/app/app.component.*` | Componente raíz de la aplicación Angular. |
| `src/app/app.config.ts` | Configuración general de la aplicación. |
| `src/app/app.routes.ts` | Archivo donde se definen las rutas principales del sistema. |
| `src/app/core/guards/` | Carpeta que contiene los guards para proteger rutas del cliente y administrador. |
| `src/app/core/services/` | Carpeta que contiene los servicios encargados de comunicarse con el backend. |
| `src/app/features/` | Carpeta que contiene los módulos o funcionalidades principales del sistema. |

---

## Módulos principales del frontend

### 1. Componente raíz

El componente raíz de la aplicación se encuentra en los archivos:

```text
app.component.ts
app.component.html
app.component.css
```

Este componente funciona como contenedor principal del sistema y permite cargar las rutas configuradas mediante Angular Router.

---

### 2. Rutas principales

El archivo `app.routes.ts` define la navegación principal del sistema.

Las rutas permiten acceder a módulos como:

- Login por DNI.
- Selector de tipo de atención.
- Chatbot.
- Login administrativo.
- Panel administrativo.
- Módulo de métricas.

Estas rutas están protegidas según el tipo de usuario. Algunas rutas requieren que el cliente se identifique mediante DNI, mientras que otras requieren autenticación administrativa.

---

### 3. Guards de seguridad

La carpeta `core/guards/` contiene los guards utilizados para proteger rutas del sistema.

| Guard | Función |
|---|---|
| `auth.guard.ts` | Protege las rutas administrativas verificando la existencia de un token de administrador. |
| `cliente-auth.guard.ts` | Protege las rutas del cliente verificando que exista una sesión válida generada después de la verificación del DNI. |

Estos guards permiten diferenciar el acceso entre clientes y administradores.

---

### 4. Servicios del frontend

La carpeta `core/services/` contiene los servicios encargados de la comunicación entre el frontend y el backend API REST.

| Servicio | Descripción |
|---|---|
| `admin.service.ts` | Gestiona las solicitudes relacionadas con citas, estados, métricas y administración. |
| `chatbot.service.ts` | Envía mensajes al backend, gestiona interacción con el chatbot y solicita recursos para voz. |
| `dni.service.ts` | Permite verificar el DNI del cliente antes de ingresar al sistema conversacional. |

Los servicios permiten separar la lógica de comunicación HTTP de los componentes visuales.

---

## Funcionalidades principales

El frontend permite realizar las siguientes funcionalidades:

- Identificación del cliente mediante DNI.
- Selección del modo de atención.
- Interacción con chatbot por texto.
- Interacción con asistente por voz.
- Visualización de respuestas del asistente.
- Persistencia local del historial de conversación.
- Acceso administrativo mediante login.
- Visualización de citas registradas.
- Cambio de estado de citas.
- Visualización de métricas.
- Exportación de información en formato Excel.
- Conexión con backend API REST.
- Integración con servicios de voz mediante LiveKit y Retell.
- Diseño responsivo para navegador web.

---

## Componentes principales

### 1. DNI Login

Ubicación:

```text
src/app/features/dni-login/
```

Este módulo permite que el cliente ingrese su DNI antes de acceder al sistema conversacional. El DNI es enviado al backend para su validación y generación de sesión.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `dni-login.component.ts` | Contiene la lógica de validación del DNI y navegación posterior. |
| `dni-login.component.html` | Contiene la estructura visual del formulario de DNI. |
| `dni-login.component.css` | Contiene los estilos del módulo de identificación. |

---

### 2. Selector de chat

Ubicación:

```text
src/app/features/chat-selector/
```

Este módulo permite que el usuario seleccione el tipo de atención o modo de interacción antes de ingresar al chatbot.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `chat-selector.component.ts` | Contiene la lógica para seleccionar el modo de atención. |
| `chat-selector.component.html` | Contiene la interfaz visual del selector. |
| `chat-selector.component.css` | Contiene los estilos del selector. |

---

### 3. Chatbot

Ubicación:

```text
src/app/features/chat/
```

Este módulo contiene la interfaz principal del chatbot. Permite al usuario escribir mensajes, recibir respuestas, activar el micrófono, usar síntesis de voz y conectarse con servicios de voz.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `chat.component.ts` | Contiene la lógica principal del chatbot, envío de mensajes, voz, historial y conexión con backend. |
| `chat.component.html` | Contiene la interfaz visual del chat. |
| `chat.component.css` | Contiene los estilos del módulo conversacional. |

Funcionalidades del módulo de chat:

- Envío de mensajes al backend.
- Recepción de respuestas del asistente.
- Visualización del historial conversacional.
- Uso de micrófono para entrada por voz.
- Uso de síntesis de voz para respuestas habladas.
- Conexión con módulos de voz.
- Integración con el asistente virtual Mara.
- Almacenamiento local temporal de conversación.

---

### 4. Login administrativo

Ubicación:

```text
src/app/features/login/
```

Este módulo permite que el administrador ingrese al panel administrativo mediante credenciales.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `login.component.ts` | Contiene la lógica de autenticación administrativa. |
| `login.component.html` | Contiene el formulario de inicio de sesión. |
| `login.component.css` | Contiene los estilos del login administrativo. |

---

### 5. Panel administrativo

Ubicación:

```text
src/app/features/admin/
```

Este módulo permite administrar las citas registradas en el sistema. Desde este panel se pueden consultar citas, filtrar información, cambiar estados y exportar datos.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `admin.component.ts` | Contiene la lógica de gestión de citas, filtros, métricas y exportación. |
| `admin.component.html` | Contiene la interfaz visual del panel administrativo. |
| `admin.component.css` | Contiene los estilos del panel. |

Funcionalidades del panel administrativo:

- Visualización de citas.
- Filtro de citas por cliente o estado.
- Cambio de estado de citas.
- Visualización de métricas generales.
- Exportación de información en Excel.
- Comunicación con el backend mediante `admin.service.ts`.

---

### 6. Módulo de métricas

Ubicación:

```text
src/app/features/metricas/
```

Este módulo permite visualizar información relacionada con el comportamiento del chatbot, interacciones, citas y uso de funcionalidades del sistema.

Archivos principales:

| Archivo | Descripción |
|---|---|
| `metricas.component.ts` | Contiene la lógica para obtener y mostrar métricas. |
| `metricas.component.html` | Contiene la interfaz visual de métricas. |
| `metricas.component.css` | Contiene los estilos del módulo. |
| `metricas.service.ts` | Servicio específico para consultar métricas del backend. |

Funcionalidades del módulo de métricas:

- Visualización de estadísticas.
- Consulta de datos desde el backend.
- Presentación gráfica de información.
- Apoyo a la toma de decisiones administrativas.

---

## Flujo general del frontend

El flujo general de uso del sistema es el siguiente:

1. El cliente ingresa a la aplicación web.
2. El sistema solicita la identificación mediante DNI.
3. El frontend envía el DNI al backend para validación.
4. Si el DNI es válido, el usuario accede al selector de atención.
5. El usuario selecciona el modo de interacción.
6. El cliente ingresa al chatbot.
7. El mensaje se envía al backend mediante `chatbot.service.ts`.
8. El backend procesa la consulta y devuelve una respuesta.
9. El frontend muestra la respuesta al usuario.
10. Si se usa voz, el sistema puede transcribir la consulta y reproducir la respuesta hablada.
11. El administrador puede ingresar al panel mediante login.
12. El panel administrativo permite gestionar citas y visualizar métricas.

---

## Arquitectura lógica del frontend

```text
Usuario cliente / Administrador
              |
              v
        Aplicación Angular
              |
              v
        Componentes visuales
              |
              v
        Servicios Angular
              |
              v
        Backend API REST
              |
              v
 Base de datos / IA / Servicios externos
```

---

## Comunicación con backend

El frontend se comunica con el backend mediante servicios Angular y peticiones HTTP.

Los servicios principales son:

```text
admin.service.ts
chatbot.service.ts
dni.service.ts
metricas.service.ts
```

Estos servicios permiten enviar y recibir información desde los endpoints del backend.

Ejemplos de funcionalidades conectadas al backend:

- Validación de DNI.
- Envío de mensajes al chatbot.
- Consulta de citas.
- Actualización de estados.
- Consulta de métricas.
- Creación de llamadas o sesiones de voz.
- Generación de tokens para LiveKit.

---

## Seguridad en frontend

El frontend implementa protección de rutas mediante guards.

```text
auth.guard.ts
cliente-auth.guard.ts
```

El `auth.guard.ts` protege las rutas administrativas y verifica que exista un token válido de administrador.

El `cliente-auth.guard.ts` protege las rutas del cliente y valida que exista una sesión de usuario generada después del ingreso del DNI.

Además, se utiliza `localStorage` para almacenar temporalmente información de sesión como token administrativo, identificador de sesión del cliente e historial conversacional.

---

## Módulo de voz

El frontend incorpora funcionalidades de voz mediante el uso de tecnologías del navegador y servicios externos.

Funcionalidades principales:

- Reconocimiento de voz.
- Transcripción de consulta hablada.
- Envío de mensaje transcrito al backend.
- Síntesis de voz para reproducir respuestas.
- Integración con servicios de voz.
- Interacción con asistente virtual Mara.

Este módulo permite que el sistema no se limite únicamente a texto, sino que también pueda ofrecer una experiencia conversacional multimodal.

---

## Panel administrativo

El panel administrativo permite gestionar información operativa del taller.

Funciones principales:

- Visualizar citas registradas.
- Buscar citas por cliente.
- Filtrar citas por estado.
- Cambiar estado de citas.
- Visualizar métricas.
- Exportar datos a Excel.
- Evaluar información registrada por el sistema.

Este módulo está orientado al personal administrativo del taller.

---

## Métricas

El sistema frontend permite visualizar métricas obtenidas desde el backend.

Entre las métricas consideradas se encuentran:

- Número de interacciones.
- Distribución por canal.
- Estados de citas.
- Métricas del chatbot.
- Métricas del módulo de voz.
- Información útil para la toma de decisiones.

Las métricas pueden representarse mediante gráficos y paneles informativos.

---

## Instalación y ejecución local

Para ejecutar el frontend de manera local, se deben seguir los siguientes pasos:

### 1. Clonar el repositorio

```bash
git clone https://github.com/ChatbotTaller/frontOpenSource.git
```

### 2. Ingresar al proyecto

```bash
cd frontOpenSource
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar el servidor de desarrollo

```bash
ng serve
```

O también:

```bash
npm start
```

### 5. Abrir en el navegador

```text
http://localhost:4200
```

---

## Construcción para producción

Para generar una versión optimizada del frontend se puede utilizar:

```bash
ng build
```

Los archivos generados se ubican en la carpeta de distribución configurada por Angular.

---

## Despliegue

El frontend puede desplegarse en servicios cloud como Vercel. Para ello, se debe conectar el repositorio de GitHub con la plataforma de despliegue y configurar el comando de construcción correspondiente.

Comando de construcción:

```bash
ng build
```

Directorio de salida:

```text
dist/
```

---

## Uso académico

Este repositorio forma parte del proyecto académico **Asistente Conversacional Integrado con Agentes de Voz**, desarrollado para el Taller Reyes Polo.

El código fuente se presenta como evidencia técnica del desarrollo realizado, incluyendo:

- Frontend web en Angular.
- Rutas protegidas.
- Servicios HTTP.
- Chatbot web.
- Interacción por voz.
- Panel administrativo.
- Gestión de citas.
- Módulo de métricas.
- Exportación de información.
- Integración con backend API REST.

---

## Evidencia para el informe

Este repositorio puede ser utilizado como evidencia dentro del **Anexo A: Código fuente** del informe de Capstone Project.

Se recomienda incluir en el documento las siguientes capturas:

- Organización ChatbotTaller en GitHub.
- Repositorio frontOpenSource.
- README del frontend documentado.
- Estructura general del frontend.
- Archivo `app.routes.ts`.
- Carpeta `core/services/`.
- Carpeta `core/guards/`.
- Carpeta `features/chat/`.
- Carpeta `features/admin/`.
- Carpeta `features/metricas/`.

---

## Autoría

Proyecto desarrollado como parte del curso de Capstone Project / Taller Integrador.

Repositorio perteneciente a la organización:

```text
ChatbotTaller
```

URL de la organización:

```text
https://github.com/orgs/ChatbotTaller/repositories
```

---

## Nota

Este repositorio tiene fines académicos y documenta el desarrollo del frontend del sistema conversacional para la atención automatizada, gestión de citas, administración interna, métricas e interacción por voz del Taller Reyes Polo.
