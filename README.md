# Booking Management System (API de Gestión de Reservas)

Este proyecto es una API RESTful desarrollada con **Express.js** y **TypeScript** para la gestión de reservas de una plataforma de servicios. Implementa todas las reglas de negocio especificadas en la prueba técnica, incluyendo validación de horarios, días festivos en Colombia 2026, solapamientos, límites de reservas concurrentes y políticas de reembolso por cancelación .

---

## 🛠️ Requisitos e Instalación

### Requisitos Previos
- **Node.js** v18 o superior.
- **npm** o yarn.

### Instalación
1. Clona el repositorio e ingresa al directorio del proyecto:
   ```bash
   git clone <repo-url>
   cd booking-management-system-dev
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```

---

## 🚀 Ejecución y Pruebas

### Ejecutar en Modo Desarrollo (con recarga automática)
```bash
npm run dev
```
La API estará disponible en: [http://localhost:3000](http://localhost:3000)

### Compilar y Ejecutar en Producción
```bash
npm run build
npm start
```

### Ejecutar la Suite de Pruebas (Vitest)
```bash
npm test
```

---

## 📂 Arquitectura del Proyecto

El sistema sigue una arquitectura por capas limpia para separar la lógica de negocio de la infraestructura HTTP:

```
src/
├── domain/                      # Lógica de Negocio Pura y Entidades
│   ├── entities.ts              # Definición de tipos e interfaces core
│   ├── booking-rules.ts         # Orquestador y validador de reglas de creación
│   ├── refund-calculator.ts     # Cálculo de reembolsos según plan e intervalos
│   ├── datetime-service.ts      # Manejo de conversiones y validaciones de zona horaria
│   ├── colombian-holidays.ts    # Festivos de Colombia 2026 con Ley Emiliani
│   └── errors.ts                # Clases de error de dominio (400, 404, 409)
├── repositories/                # Capa de Acceso a Datos (En Memoria)
│   ├── interfaces.ts            # Definición de contratos de almacenamiento
│   ├── user.repository.ts
│   ├── service.repository.ts
│   └── reservation.repository.ts
├── services/                    # Casos de Uso
│   └── reservation.service.ts   # Orquestador del ciclo de vida de la reserva
├── infrastructure/              # Capa de Soporte técnico
│   ├── seed-normalizer.ts       # Normalización y saneamiento del JSON con Zod
│   └── data-loader.ts           # Lectura y poblamiento del repositorio in-memory
├── api/                         # Capa de Transporte (HTTP Express)
│   ├── routes.ts                # Rutas expuestas de la API
│   ├── reservation.controller.ts# Parseo de parámetros y formateo de respuestas
│   └── error-handler.ts         # Middleware para mapear errores de dominio a HTTP
├── app.ts                       # Fábrica de la aplicación Express (para tests)
└── server.ts                    # Punto de entrada para levantar el servicio
```

---

## 📋 Decisiones de Diseño y Supuestos Asumidos

### 1. Stack Tecnológico
Se seleccionó **Express.js** + **TypeScript** en lugar de frameworks Full-Stack (como Next.js) para mantener la solución limpia, enfocada y libre de overhead innecesario. Esta arquitectura demuestra simplicidad y uso de herramientas específicas para resolver un problema de backend puro (BFF/API).

### 2. Base de Datos en Memoria y Snapshot de Precios
Los datos se almacenan en repositorios in-memory que se inicializan leyendo el archivo `data/seed.json`.
- **Decisión de Negocio**: Cuando se crea una reserva, se almacena un **snapshot del precio** actual del servicio (`reservation.price`). Si el precio del servicio cambia en el catálogo en el futuro, la reserva preexistente mantiene el monto con el que fue adquirida y se calcula el reembolso sobre ese precio histórico.

### 3. Zona Horaria y Fechas
Toda la lógica de tiempos se maneja estrictamente bajo la zona horaria **America/Bogota**.
- El backend almacena e interactúa internamente con objetos `Date` de JavaScript (que representan la marca de tiempo en UTC).
- En el momento de validar horarios de operación (07:00 a 19:00), días de la semana y festivos, el servicio transforma las fechas a la zona horaria local de Bogotá usando `date-fns-tz`.

### 4. Horarios de Operación y Anticipación Mínima
- **Horario de Operación**: Lunes a Sábado de **07:00 a 19:00** (Hora Bogotá). La reserva no puede empezar antes de las 07:00 ni finalizar después de las 19:00.
- **Anticipación Mínima**: Las reservas deben solicitarse con al menos **2 horas** de anticipación respecto a la hora local actual de la solicitud.

### 5. Umbrales de Reembolso y Límites
Los límites horarios se definen con inclusividad matemática superior. Específicamente:
- **Usuario Estándar**:
  - $\ge$ 24 horas de anticipación: **100% de reembolso**.
  - $\ge$ 4 horas y < 24 horas: **50% de reembolso**.
  - < 4 horas: **0% de reembolso**.
- **Usuario Premium**:
  - $\ge$ 4 horas de anticipación: **100% de reembolso**.
  - $\ge$ 1 hora y < 4 horas: **50% de reembolso**.
  - < 1 hora: **0% de reembolso**.
- **Servicio no reembolsable (`nonRefundable: true`)**: Siempre genera **0% de reembolso** sin importar el plan de usuario o la antelación, aunque sí se permite realizar la cancelación.
- **Cancelaciones Inválidas**:
  - Cancelar una reserva que ya está cancelada arroja un código **409 Conflict**.
  - Cancelar una reserva que ocurrió en el pasado (`startDateTime < now`) arroja un código **400 Bad Request**.

---

## 🧹 Saneamiento de Datos (`SeedNormalizer`)

El archivo `data/seed.json` contiene inconsistencias intencionales que el sistema normaliza en tiempo de inicio utilizando **Zod**:
1. **Formatos de fecha mixtos**: El sistema procesa fechas en ISO 8601 (con/sin offset), strings en formato local de Colombia `DD/MM/YYYY HH:mm` y marcas de tiempo Unix (en milisegundos). Todas se convierten a objetos `Date` estandarizados.
2. **Campos omitidos**:
   - `plan` en el usuario: Fallback automático a `"standard"`.
   - `nonRefundable` en el servicio: Fallback automático a `false`.
   - `status` en la reserva: Fallback automático a `"active"`.
   - Nombre o Email omitidos: Fallback a valores placeholders.
3. **Advertencias de Consola**: Cada vez que el normalizador encuentra y sanea una inconsistencia, emite un aviso controlado con `console.warn` para mantener la trazabilidad.

---

## 🌐 Referencia de la API HTTP

### 1. Crear una Reserva
Registra una cita en el sistema validando las reglas de negocio.

- **URL**: `POST /api/reservations`
- **Body**:
  ```json
  {
    "userId": "user-3",
    "serviceId": "svc-1",
    "startDateTime": "2026-06-20T10:00:00"
  }
  ```
- **Respuesta Exitosa (201 Created)**:
  ```json
  {
    "message": "Reserva creada exitosamente.",
    "reservation": {
      "id": "res-x9y2z3",
      "userId": "user-3",
      "serviceId": "svc-1",
      "professionalId": "prof-1",
      "startDateTime": "2026-06-20T15:00:00.000Z",
      "endDateTime": "2026-06-20T15:30:00.000Z",
      "status": "active",
      "price": 50000,
      "createdAt": "2026-06-18T17:00:00.000Z"
    }
  }
  ```
- **Respuestas de Error**:
  - **400 Bad Request (Conflictos de Reglas)**:
    ```json
    {
      "error": "No se pudo crear la reserva debido a conflictos con las reglas de negocio.",
      "details": [
        { "field": "startDateTime", "message": "No se procesan reservas los domingos." }
      ]
    }
    ```
  - **404 Not Found (Usuario o Servicio no existe)**:
    ```json
    { "error": "Usuario con ID 'user-nonexistent' no fue encontrado." }
    ```

### 2. Cancelar una Reserva
Cancela la reserva por su ID y calcula la devolución monetaria.

- **URL**: `POST /api/reservations/:id/cancel`
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "message": "Reserva cancelada exitosamente.",
    "reservation": {
      "id": "res-1",
      "userId": "user-3",
      "serviceId": "svc-1",
      "status": "cancelled",
      "price": 50000,
      ...
    },
    "refundPercentage": 100,
    "refundAmount": 50000
  }
  ```
- **Respuestas de Error**:
  - **400 Bad Request (Reserva pasada)**: `{ "error": "No se pueden cancelar reservas que pertenecen al pasado." }`
  - **409 Conflict (Ya cancelada)**: `{ "error": "La reserva ya se encuentra cancelada." }`
  - **404 Not Found**: `{ "error": "Reserva con ID 'res-xyz' no fue encontrada." }`

### 3. Listar Reservas
Obtiene el historial de reservas de un usuario dentro de un rango de fechas opcional.

- **URL**: `GET /api/reservations?userId=user-3&from=2026-06-19T00:00:00&to=2026-06-21T23:59:59`
- **Respuesta Exitosa (200 OK)**:
  ```json
  {
    "userId": "user-3",
    "count": 1,
    "reservations": [
      {
        "id": "res-1",
        "userId": "user-3",
        "serviceId": "svc-1",
        "startDateTime": "2026-06-20T15:00:00.000Z",
        "status": "active",
        ...
      }
    ]
  }
  ```

---

## 🚀 Mejoras Futuras Sugeridas
1. **Base de Datos Real**: Reemplazar los repositorios en memoria por un ORM como Prisma con PostgreSQL.
2. **Control de Concurrencia**: Agregar mecanismos de locking (p.ej. transacciones ACID o locks de base de datos) para garantizar que dos solicitudes simultáneas de reserva para el mismo profesional en la misma hora no generen un doble agendamiento.
3. **Módulo de Festivos Dinámico**: Reemplazar la lista hardcodeada por una integración con una API externa de días festivos o una librería especializada como `colombia-holidays` para soportar dinámicamente cualquier año.
