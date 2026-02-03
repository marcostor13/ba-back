# Documentación de API - BA Backend

Esta documentación describe todos los endpoints disponibles en la API del proyecto BA Backend.

**Base URL**: `http://localhost:3000` (o la URL configurada en tu entorno)

---

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Compañías](#compañías)
3. [Roles](#roles)
4. [Clientes](#clientes)
5. [Cotizaciones](#cotizaciones)
6. [Proyectos](#proyectos)
7. [Pagos](#pagos)
8. [KPIs](#kpis)
9. [Subida de Archivos](#subida-de-archivos)
10. [Audio](#audio)
11. [Logs](#logs)
12. [General](#general)

---

## Autenticación

### Resumen de endpoints

| Método | Endpoint                       | Descripción                                                                       |
| ------ | ------------------------------ | --------------------------------------------------------------------------------- |
| POST   | `/auth/register`               | Registro directo (legacy). Se recomienda el flujo con verificación por email.     |
| POST   | `/auth/register/request-code`  | Envía código de 6 dígitos al email para completar el registro (paso 1).           |
| POST   | `/auth/register/confirm`       | Confirma el código y completa el registro (paso 2).                               |
| DELETE | `/auth/account`                | **Borrado físico**: elimina usuario, roles y Customer asociado (requiere JWT).    |
| POST   | `/auth/account/anonymize`      | **Anonimización**: mantiene registros pero borra datos personales (requiere JWT). |
| POST   | `/auth/login`                  | Inicio de sesión con email y contraseña.                                          |
| GET    | `/auth/profile`                | Perfil del usuario autenticado (requiere JWT).                                    |
| GET    | `/auth/google`                 | Inicia OAuth con Google.                                                          |
| GET    | `/auth/google/callback`        | Callback de Google OAuth.                                                         |
| POST   | `/auth/login-with-google`      | Login con datos de Google.                                                        |
| POST   | `/auth/refresh-token`          | Refresca el JWT.                                                                  |
| POST   | `/auth/password-reset/request` | Solicita código para restablecer contraseña.                                      |
| POST   | `/auth/password-reset/confirm` | Confirma código y define nueva contraseña.                                        |

---

### POST `/auth/register`

Registra un nuevo usuario en el sistema. Automáticamente crea un role "customer" asociado al usuario.

> **Nota**: Este endpoint está disponible para compatibilidad, pero se recomienda usar el nuevo flujo de registro con verificación por código de 6 dígitos (`POST /auth/register/request-code` y `POST /auth/register/confirm`).

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido, formato email válido)",
  "password": "string (requerido, mínimo 6 caracteres)",
  "name": "string (requerido)"
}
```

**Respuesta exitosa** (200):

```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "role": "customer"
  }
}
```

---

### POST `/auth/register/request-code`

Inicia el proceso de registro enviando un código de verificación de 6 dígitos al correo electrónico del usuario. Este es el primer paso del flujo de registro con verificación por email.

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido, formato email válido)",
  "name": "string (requerido)",
  "password": "string (requerido, mínimo 6 caracteres)"
}
```

**Respuesta exitosa** (200):

```json
{
  "message": "Código de verificación enviado al correo electrónico"
}
```

**Errores posibles**:

- `400 Bad Request`: Si el correo ya está registrado en el sistema
- `400 Bad Request`: Si los datos de validación no son correctos

> **Nota**: El código expira en 15 minutos. Si el código expira o es inválido, el usuario debe solicitar un nuevo código.

---

### POST `/auth/register/confirm`

Confirma el código de verificación enviado al correo y completa el registro del usuario. Este es el segundo paso del flujo de registro con verificación por email.

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido, formato email válido)",
  "code": "string (requerido, código de 6 dígitos enviado al correo)"
}
```

**Respuesta exitosa** (200):

```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "role": "customer"
  }
}
```

**Errores posibles**:

- `400 Bad Request`: Si el código es inválido o ha expirado
- `400 Bad Request`: Si el correo ya está registrado (puede ocurrir si se registró entre la solicitud del código y la confirmación)

**Flujo de registro con verificación**:

1. El usuario envía sus datos (nombre, email, contraseña) a `POST /auth/register/request-code`
2. El sistema envía un código de 6 dígitos al correo del usuario
3. El usuario ingresa el código recibido en `POST /auth/register/confirm`
4. Si el código es válido, se completa el registro y se retorna el token JWT

---

### DELETE `/auth/account`

Elimina la cuenta del usuario autenticado de forma **física**: se borran el usuario, sus roles y el registro de cliente (Customer) asociado. No se eliminan cotizaciones, proyectos, facturas ni pagos (pueden quedar referencias huérfanas o anonimizadas según política).

**Autenticación**: Requerida (JWT Token)

**Headers**:

```
Authorization: Bearer {jwt_token}
```

**Body**: No requerido (el usuario se identifica por el token).

**Respuesta exitosa** (200):

```json
{
  "message": "Account deleted successfully"
}
```

**Errores posibles**:

- `401 Unauthorized`: Token inválido o no enviado
- `400 Bad Request`: Usuario no encontrado

---

### POST `/auth/account/anonymize`

**Anonimiza** la cuenta del usuario autenticado: se mantienen los registros (para facturas u obligaciones legales) pero se borran o reemplazan todos los datos personales (nombre, email, teléfono, dirección, etc.) en User y en Customer. El usuario no podrá volver a iniciar sesión.

**Autenticación**: Requerida (JWT Token)

**Headers**:

```
Authorization: Bearer {jwt_token}
```

**Body**: No requerido.

**Respuesta exitosa** (200):

```json
{
  "message": "Account anonymized successfully"
}
```

**Errores posibles**:

- `401 Unauthorized`: Token inválido o no enviado
- `400 Bad Request`: Usuario no encontrado

---

### POST `/auth/login`

Inicia sesión con email y contraseña.

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido)",
  "password": "string (requerido)"
}
```

**Respuesta exitosa** (200):

```json
{
  "access_token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "role": "customer"
  }
}
```

---

### GET `/auth/profile`

Obtiene el perfil del usuario autenticado.

**Autenticación**: Requerida (JWT Token)

**Headers**:

```
Authorization: Bearer {jwt_token}
```

---

### GET `/auth/google`

Inicia el flujo de autenticación OAuth con Google.

**Autenticación**: No requerida

---

### GET `/auth/google/callback`

Callback de Google OAuth después de la autenticación.

**Autenticación**: No requerida

---

### POST `/auth/login-with-google`

Inicia sesión con datos de usuario de Google.

**Autenticación**: No requerida

---

### POST `/auth/refresh-token`

Refresca el token JWT del usuario.

**Autenticación**: No requerida

---

### POST `/auth/password-reset/request`

Inicia el proceso de restablecimiento de contraseña enviando un código temporal al correo del usuario.

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido, correo registrado del usuario)"
}
```

**Respuesta exitosa** (200):

```json
{
  "message": "Código enviado al correo registrado"
}
```

> **Nota:** Por motivos de seguridad, la respuesta es la misma aunque el correo no exista. El código expira en 15 minutos.

---

### POST `/auth/password-reset/confirm`

Confirma el código enviado al correo y permite definir una nueva contraseña.

**Autenticación**: No requerida

**Body**:

```json
{
  "email": "string (requerido)",
  "code": "string (requerido, código de 6 dígitos enviado al correo)",
  "newPassword": "string (requerido, mínimo 6 caracteres)"
}
```

**Respuesta exitosa** (200):

```json
{
  "message": "Contraseña actualizada correctamente"
}
```

---

## Compañías

### POST `/company`

Crea una nueva compañía en el sistema.

**Autenticación**: No especificada

**Body**:

```json
{
  "name": "string (requerido, único)",
  "description": "string (opcional)",
  "configuration": "object (opcional)",
  "active": "boolean (opcional, default: true)"
}
```

**Ejemplo**:

```json
{
  "name": "BA Kitchen & Bath Design",
  "description": "Especializada en diseño, construcción y remodelación de cocinas y baños",
  "active": true
}
```

**Respuesta exitosa** (201):

```json
{
  "_id": "company_id",
  "name": "BA Kitchen & Bath Design",
  "description": "...",
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET `/company`

Obtiene todas las compañías del sistema.

**Autenticación**: No especificada

**Query Parameters**:

- `activeOnly` (string, opcional): Filtrar solo compañías activas ("true" o "false")

**Ejemplo**:

```
GET /company?activeOnly=true
```

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "company_id",
    "name": "BA Kitchen & Bath Design",
    "active": true,
    ...
  }
]
```

---

### GET `/company/:id`

Obtiene una compañía específica por su ID.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID de la compañía

---

### PATCH `/company/:id`

Actualiza una compañía existente.

**Autenticación**: No especificada

**Body**: Todos los campos son opcionales

---

### DELETE `/company/:id`

Elimina una compañía del sistema.

**Autenticación**: No especificada

---

## Roles

### POST `/role`

Crea un nuevo role en el sistema.

**Autenticación**: No especificada

**Body**:

```json
{
  "name": "string",
  "userId": "ObjectId (MongoDB)",
  "active": "boolean (opcional, default: true)"
}
```

---

### GET `/role`

Obtiene todos los roles del sistema.

**Autenticación**: No especificada

---

### GET `/role/:id`

Obtiene un role específico por su ID.

**Autenticación**: No especificada

---

### PATCH `/role/:id`

Actualiza un role existente.

**Autenticación**: No especificada

---

### DELETE `/role/:id`

Elimina un role del sistema.

**Autenticación**: No especificada

---

## Clientes

### POST `/customer`

Crea un nuevo cliente en el sistema.

**Autenticación**: No especificada

**Body**:

```json
{
  "name": "string (opcional)",
  "lastName": "string (opcional)",
  "phone": "string (opcional)",
  "date": "Date (opcional)",
  "email": "string (requerido, formato email válido, se usará para crear el usuario)",
  "address": "string (opcional)",
  "city": "string (opcional)",
  "zipCode": "string (opcional)",
  "state": "string (opcional)",
  "leadSource": "string (opcional)",
  "description": "string (opcional)",
  "companyId": "string (opcional, MongoDB ObjectId)"
}
```

**Notas**:

- El campo `companyId` permite asociar el cliente a una compañía específica.
- Al crear un cliente se genera automáticamente un usuario en el sistema con una contraseña temporal que se envía por correo electrónico. El cliente debe usarla para iniciar sesión y cambiarla.

---

### GET `/customer`

Obtiene todos los clientes del sistema, opcionalmente filtrados por compañía.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar clientes por compañía

**Ejemplo**:

```
GET /customer?companyId=507f1f77bcf86cd799439011
```

---

### GET `/customer/:id`

Obtiene un cliente específico por su ID.

**Autenticación**: No especificada

---

### PATCH `/customer/:id`

Actualiza un cliente existente.

**Autenticación**: No especificada

---

### DELETE `/customer/:id`

Elimina un cliente del sistema.

**Autenticación**: No especificada

---

## Cotizaciones

**Nota Importante**: Las cotizaciones (quotes/estimaciones) se crean **después** de crear un proyecto. Primero debe existir un proyecto, y luego se pueden crear múltiples estimaciones para ese proyecto.

### Flujo de Aprobación de Estimaciones

El sistema implementa un flujo de aprobación con los siguientes estados y transiciones:

**Estados disponibles**: `draft`, `pending`, `approved`, `sent`, `rejected`, `in_progress`, `completed`

**Flujo de transiciones válidas**:

- `draft` → `pending` (enviar para revisión) o `sent` (enviar directamente al cliente)
- `pending` → `approved` (aprobación interna) o `rejected` (rechazo con comentarios obligatorios)
- `approved` → `sent` (enviar al cliente) o `in_progress` (iniciar proyecto)
- `sent` → `approved`, `rejected` o `in_progress`
- `rejected` → `draft` (volver a editar) o `pending` (reenviar para revisión)
- `in_progress` → `completed`

**Nota sobre rechazos**: Cuando una cotización se rechaza (`status: "rejected"`), el campo `rejectionComments.comment` es **obligatorio** para documentar el motivo del rechazo.

### POST `/quote`

Crea una nueva cotización/estimación para un proyecto existente (disponible para las categorías `kitchen`, `bathroom`, `basement` y `additional-work`).

**Autenticación**: No especificada

**Body**:

```json
{
  "customerId": "string (requerido, MongoDB ObjectId)",
  "companyId": "string (requerido, MongoDB ObjectId)",
  "projectId": "string (requerido, MongoDB ObjectId)",
  "experience": "string (requerido)",
  "category": "kitchen | bathroom | basement | additional-work (requerido)",
  "userId": "string (requerido, MongoDB ObjectId)",
  "versionNumber": "number (requerido)",
  "totalPrice": "number (requerido)",
  "status": "draft | pending | approved | sent | rejected | in_progress | completed (opcional, default: draft)",
  "notes": "string (opcional)",
  "rejectionComments": "RejectionComments (opcional, requerido si status es rejected)"
  "kitchenInformation": "KitchenInformation (opcional, sólo para category: kitchen)",
  "bathroomInformation": "BathroomInformation (opcional, sólo para category: bathroom)",
  "basementInformation": "BasementInformation (opcional, sólo para category: basement)",
  "additionalWorkInformation": "AdditionalWorkInformation (opcional, sólo para category: additional-work)",
  "countertopsFiles": "string[] (opcional, array de URLs de archivos de countertops)",
  "backsplashFiles": "string[] (opcional, array de URLs de archivos de backsplash)",
  "materials": "Materials (opcional, objeto con file e items para gestionar la lista de materiales)"
}
```

Los objetos `KitchenInformation`, `BathroomInformation`, `BasementInformation` y `AdditionalWorkInformation` utilizan nombres tipados y estandarizados.  
El formulario de cocina se basa directamente en `docs/inputs.json`, por lo que todos los `name` de ese archivo ahora siguen el formato camelCase y sin números iniciales (por ejemplo: `woodHoodVentThirtySix`, `stackersTwelve`, `paintCeilingTwoCoats`, etc.).

**Campo `rejectionComments`**: Este campo es requerido cuando `status` es `rejected`. Estructura:

```json
{
  "comment": "string (requerido si status es rejected)",
  "rejectedBy": "string (opcional, MongoDB ObjectId del usuario que rechaza)",
  "mediaFiles": "string[] (opcional, array de URLs de archivos adjuntos)"
}
```

**Campo `materials`**: Este campo opcional es un objeto que permite gestionar la lista de materiales de dos formas:

- **`file` (string, opcional)**: URL de una imagen o PDF que contiene la lista de materiales (ej: `"https://bucket.s3.amazonaws.com/materials-list.pdf"`)
- **`items` (array, opcional)**: Array de objetos con `quantity` (número) y `description` (string) para cada material ingresado manualmente

**Estructura del objeto `materials`**:

```json
{
  "file": "string (opcional, URL del archivo)",
  "items": [
    {
      "quantity": "number (requerido)",
      "description": "string (requerido)"
    }
  ]
}
```

**Nota**: Puedes usar `file` o `items`, o ambos simultáneamente. Si solo subes un archivo, solo incluye `file`. Si solo ingresas materiales manualmente, solo incluye `items`.

**Ejemplo para cocina**:

```json
{
  "customerId": "507f1f77bcf86cd799439013",
  "companyId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012",
  "category": "kitchen",
  "experience": "5 años",
  "versionNumber": 1,
  "totalPrice": 50000,
  "userId": "507f1f77bcf86cd799439011",
  "status": "draft",
  "kitchenInformation": {
    "kitchenSquareFootage": 120,
    "woodHoodVentThirtySix": true,
    "stackersTwelve": 4,
    "paintCeilingTwoCoats": "140",
    "runPowerForNewRangeTwoHundredTwentyVolt": 12
  },
  "countertopsFiles": [
    "https://bucket.s3.amazonaws.com/countertop-1.jpg",
    "https://bucket.s3.amazonaws.com/countertop-2.jpg"
  ],
  "backsplashFiles": ["https://bucket.s3.amazonaws.com/backsplash-1.jpg"],
  "materials": {
    "items": [
      {
        "quantity": 10,
        "description": "Madera de roble para gabinetes"
      },
      {
        "quantity": 5,
        "description": "Tornillos de acero inoxidable"
      },
      {
        "quantity": 2,
        "description": "Bisagras de cierre suave"
      }
    ]
  }
}
```

**Validaciones**:

- El `projectId` debe existir en el sistema
- El `companyId` de la cotización debe coincidir con el `companyId` del proyecto

**Respuesta exitosa** (201):

```json
{
  "_id": "quote_id",
  "customerId": "507f1f77bcf86cd799439013",
  "companyId": "507f1f77bcf86cd799439011",
  "category": "kitchen",
  "versionNumber": 1,
  "status": "draft",
  "userId": "507f1f77bcf86cd799439011",
  "createdAt": "2024-01-01T00:00:00.000Z",
  ...
}
```

---

### GET `/quote`

Obtiene todas las cotizaciones, con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar por compañía
- `projectId` (string, opcional): Filtrar por proyecto
- `category` (string, opcional): Filtrar por categoría (`kitchen`, `bathroom`, `basement`, `additional-work`)
- `status` (string, opcional): Filtrar por estado (draft, pending, approved, sent, rejected, in_progress, completed)
- `userId` (string, opcional): Filtrar por estimador

**Ejemplo**:

```
GET /quote?companyId=507f1f77bcf86cd799439011&projectId=507f1f77bcf86cd799439012&category=kitchen&status=approved
```

---

### GET `/quote/project/:projectId`

Obtiene todas las cotizaciones/estimaciones de un proyecto específico.

**Autenticación**: No especificada

**Parámetros**:

- `projectId` (string, requerido): ID del proyecto

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "quote_id",
    "projectId": "507f1f77bcf86cd799439012",
    "versionNumber": 1,
    "status": "draft",
    ...
  },
  {
    "_id": "quote_id_v2",
    "projectId": "507f1f77bcf86cd799439012",
    "versionNumber": 2,
    "status": "sent",
    ...
  }
]
```

**Nota**: Las cotizaciones se ordenan por `versionNumber` y fecha de creación.

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "quote_id",
    "customerId": "507f1f77bcf86cd799439013",
    "companyId": "507f1f77bcf86cd799439011",
    "category": "kitchen",
    "versionNumber": 1,
    "status": "approved",
    ...
  }
]
```

---

### GET `/quote/:id`

Obtiene una cotización específica por su ID, incluyendo la información completa del cliente (customer) y la compañía (company).

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID de la cotización

**Respuesta exitosa** (200):

```json
{
  "_id": "quote_id",
  "customerId": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "zipCode": "10001",
    "state": "NY",
    "leadSource": "Website",
    "description": "Cliente interesado en renovación de cocina"
  },
  "companyId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "BA Construction",
    "description": "Empresa de construcción y renovaciones",
    "active": true,
    "configuration": {}
  },
  "projectId": "507f1f77bcf86cd799439012",
  "category": "kitchen",
  "experience": "5 años",
  "versionNumber": 1,
  "totalPrice": 50000,
  "status": "draft",
  "userId": "507f1f77bcf86cd799439011",
  "kitchenInformation": {
    "kitchenSquareFootage": 120,
    "woodHoodVentThirtySix": true
  },
  "countertopsFiles": [],
  "backsplashFiles": [],
  "materials": {
    "items": [
      {
        "quantity": 10,
        "description": "Madera de roble para gabinetes"
      },
      {
        "quantity": 5,
        "description": "Tornillos de acero inoxidable"
      }
    ]
  },
  "notes": "Notas adicionales",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Nota**: Los campos `customerId` y `companyId` ahora se retornan como objetos completos con toda su información, en lugar de solo los IDs.

---

### GET `/quote/project/:projectId/versions`

Obtiene todas las versiones registradas para un proyecto (útil para auditar el historial completo).  
Se puede pasar un `versionNumber` opcional para filtrar una versión concreta.

**Autenticación**: No especificada

**Parámetros**:

- `projectId` (string, requerido)
- `versionNumber` (number, opcional, query param)

**Ejemplos**:

```
GET /quote/project/507f1f77bcf86cd799439012/versions
GET /quote/project/507f1f77bcf86cd799439012/versions?versionNumber=3
```

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "quote_id",
    "projectId": "507f1f77bcf86cd799439012",
    "versionNumber": 1,
    "status": "draft",
    ...
  },
  {
    "_id": "quote_id_v3",
    "projectId": "507f1f77bcf86cd799439012",
    "versionNumber": 3,
    "status": "sent",
    ...
  }
]
```

---

### PATCH `/quote/:id`

Actualiza una cotización existente (se usa para generar nuevas versiones incrementando `versionNumber` manualmente cuando sea necesario).

**Autenticación**: No especificada

**Body**: Todos los campos son opcionales, incluyendo `materials` que puede actualizarse como objeto con `file` e `items`.

**Validaciones de transición de estado**:

- El sistema valida que las transiciones de estado sean válidas según el flujo definido
- Si se intenta cambiar a `rejected`, el campo `rejectionComments.comment` es obligatorio
- Si se cambia a un estado diferente de `rejected`, el campo `rejectionComments` se limpia automáticamente

**Ejemplo de actualización con rechazo**:

```json
{
  "status": "rejected",
  "rejectionComments": {
    "comment": "El presupuesto excede los límites del cliente",
    "rejectedBy": "507f1f77bcf86cd799439011",
    "mediaFiles": ["https://bucket.s3.amazonaws.com/feedback.pdf"]
  }
}
```

**Ejemplo de actualización con materials usando items (ingreso manual)**:

```json
{
  "materials": {
    "items": [
      {
        "quantity": 15,
        "description": "Madera de roble para gabinetes"
      },
      {
        "quantity": 8,
        "description": "Tornillos de acero inoxidable"
      }
    ]
  },
  "totalPrice": 55000,
  "status": "sent"
}
```

**Ejemplo de actualización con materials usando file (archivo subido)**:

```json
{
  "materials": {
    "file": "https://bucket.s3.amazonaws.com/materials-list-v2.pdf"
  },
  "versionNumber": 2,
  "status": "sent"
}
```

**Ejemplo de actualización con materials usando ambos (file e items)**:

```json
{
  "materials": {
    "file": "https://bucket.s3.amazonaws.com/materials-list-v2.pdf",
    "items": [
      {
        "quantity": 15,
        "description": "Madera de roble para gabinetes"
      }
    ]
  },
  "versionNumber": 2,
  "status": "sent"
}
```

---

### POST `/quote/:id/approve`

Aprueba una cotización que está en estado `pending`. Cambia el estado a `approved`.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID de la cotización

**Body**:

```json
{
  "approvedBy": "string (opcional, MongoDB ObjectId del usuario que aprueba)"
}
```

**Validaciones**:

- La cotización debe estar en estado `pending`
- Si no está en `pending`, se retorna un error 400

**Respuesta exitosa** (200):

```json
{
  "_id": "quote_id",
  "status": "approved",
  ...
}
```

---

### POST `/quote/:id/reject`

Rechaza una cotización que está en estado `pending`. Cambia el estado a `rejected` y requiere comentarios de rechazo.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID de la cotización

**Body**:

```json
{
  "comment": "string (requerido, motivo del rechazo)",
  "rejectedBy": "string (opcional, MongoDB ObjectId del usuario que rechaza)",
  "mediaFiles": "string[] (opcional, array de URLs de archivos adjuntos)"
}
```

**Validaciones**:

- La cotización debe estar en estado `pending`
- El campo `comment` es obligatorio
- Si no está en `pending`, se retorna un error 400

**Respuesta exitosa** (200):

```json
{
  "_id": "quote_id",
  "status": "rejected",
  "rejectionComments": {
    "comment": "El precio es demasiado alto para el presupuesto del cliente",
    "rejectedBy": "507f1f77bcf86cd799439011",
    "rejectedAt": "2024-01-15T10:30:00.000Z",
    "mediaFiles": []
  },
  ...
}
```

---

### POST `/quote/:id/send`

Envía una cotización aprobada al cliente. Cambia el estado de `approved` a `sent`.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID de la cotización

**Body**:

```json
{
  "sentBy": "string (opcional, MongoDB ObjectId del usuario que envía)"
}
```

**Validaciones**:

- La cotización debe estar en estado `approved`
- Si no está en `approved`, se retorna un error 400

**Respuesta exitosa** (200):

```json
{
  "_id": "quote_id",
  "status": "sent",
  ...
}
```

---

### DELETE `/quote/:id`

Elimina una cotización del sistema.

**Autenticación**: No especificada

---

## Proyectos

**Nota Importante**: Los proyectos se crean **primero**, antes de las cotizaciones. Una vez creado el proyecto, se pueden crear múltiples estimaciones (quotes) para ese proyecto. Cuando se aprueba una estimación, se puede asociar al proyecto mediante `approvedQuoteId`.

### POST `/project`

Crea un nuevo proyecto. **Este es el primer paso** en el flujo de trabajo.

**Autenticación**: No especificada

**Body**:

```json
{
  "name": "string (requerido)",
  "description": "string (opcional)",
  "projectType": "kitchen | bathroom | basement | additional-work (requerido)",
  "companyId": "string (requerido, MongoDB ObjectId)",
  "customerId": "string (requerido, MongoDB ObjectId)",
  "estimatorId": "string (requerido, MongoDB ObjectId)",
  "status": "pending | in_progress | on_hold | completed | cancelled (opcional, default: pending)",
  "startDate": "Date (opcional)",
  "expectedEndDate": "Date (opcional)",
  "actualEndDate": "Date (opcional)",
  "budget": "number (opcional)",
  "approvedQuoteId": "string (opcional, MongoDB ObjectId)",
  "milestones": [
    {
      "name": "string",
      "description": "string (opcional)",
      "dueDate": "Date (opcional)",
      "completed": "boolean (opcional)",
      "completedDate": "Date (opcional)"
    }
  ],
  "photos": ["string (opcional, URLs de fotos)"],
  "notes": "string (opcional)"
}
```

**Ejemplo**:

```json
{
  "name": "Remodelación Cocina - Juan Pérez",
  "description": "Remodelación completa de cocina residencial",
  "projectType": "kitchen",
  "companyId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439013",
  "estimatorId": "507f1f77bcf86cd799439011",
  "status": "pending"
}
```

**Respuesta exitosa** (201):

```json
{
  "_id": "project_id",
  "name": "Remodelación Cocina - Juan Pérez",
  "projectType": "kitchen",
  "companyId": "507f1f77bcf86cd799439011",
  "customerId": "507f1f77bcf86cd799439013",
  "estimatorId": "507f1f77bcf86cd799439011",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  ...
}
```

**Nota**: El campo `approvedQuoteId` se puede establecer cuando se aprueba una estimación, asociando la cotización aprobada al proyecto.

---

### GET `/project`

Obtiene todos los proyectos, con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar por compañía
- `customerId` (string, opcional): Filtrar por cliente
- `estimatorId` (string, opcional): Filtrar por estimador
- `status` (string, opcional): Filtrar por estado

**Ejemplo**:

```
GET /project?companyId=507f1f77bcf86cd799439011&status=in_progress
```

---

### GET `/project/:id`

Obtiene un proyecto específico por su ID.

**Autenticación**: No especificada

---

### PATCH `/project/:id`

Actualiza un proyecto existente.

**Autenticación**: No especificada

---

### POST `/project/:id/update`

Agrega una actualización (update) a un proyecto.

**Autenticación**: No especificada

**Body**:

```json
{
  "title": "string (requerido)",
  "description": "string (requerido)",
  "userId": "string (requerido, MongoDB ObjectId)",
  "attachments": ["string (opcional, URLs de archivos)"]
}
```

**Respuesta exitosa** (200):

```json
{
  "_id": "project_id",
  "updates": [
    {
      "title": "Instalación de gabinetes completada",
      "description": "Se instalaron todos los gabinetes según especificaciones",
      "date": "2024-01-15T10:00:00.000Z",
      "userId": "507f1f77bcf86cd799439011"
    }
  ],
  ...
}
```

---

### DELETE `/project/:id`

Elimina un proyecto del sistema.

**Autenticación**: No especificada

---

## Pagos

### POST `/payment`

Crea un nuevo registro de pago.

**Autenticación**: No especificada

**Body**:

```json
{
  "companyId": "string (requerido, MongoDB ObjectId)",
  "projectId": "string (requerido, MongoDB ObjectId)",
  "customerId": "string (requerido, MongoDB ObjectId)",
  "amount": "number (requerido)",
  "type": "full | partial (requerido)",
  "status": "pending | completed | failed | refunded (opcional, default: pending)",
  "paymentDate": "Date (requerido)",
  "receiptUrl": "string (opcional)",
  "notes": "string (opcional)",
  "transactionId": "string (opcional)"
}
```

**Ejemplo**:

```json
{
  "companyId": "507f1f77bcf86cd799439011",
  "projectId": "507f1f77bcf86cd799439012",
  "customerId": "507f1f77bcf86cd799439013",
  "amount": 25000,
  "type": "partial",
  "status": "completed",
  "paymentDate": "2024-01-15T00:00:00.000Z",
  "receiptUrl": "https://..."
}
```

---

### GET `/payment`

Obtiene todos los pagos, con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar por compañía
- `projectId` (string, opcional): Filtrar por proyecto
- `customerId` (string, opcional): Filtrar por cliente
- `status` (string, opcional): Filtrar por estado

---

### GET `/payment/:id`

Obtiene un pago específico por su ID.

**Autenticación**: No especificada

---

### PATCH `/payment/:id`

Actualiza un pago existente.

**Autenticación**: No especificada

---

### DELETE `/payment/:id`

Elimina un pago del sistema.

**Autenticación**: No especificada

---

## KPIs

El módulo de KPIs proporciona métricas agregadas y datos para dashboards. Todos los endpoints de KPI admiten ahora filtros por compañía, usuario y rango de fechas.

### GET `/kpi`

Obtiene todos los KPIs consolidados.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar KPIs por compañía específica.
- `userId` (string, opcional): Filtrar por estimador/usuario específico.
- `startDate` (string, opcional): Fecha de inicio del periodo (ISO 8601).
- `endDate` (string, opcional): Fecha de fin del periodo (ISO 8601).

**Ejemplo**:

```
GET /kpi?companyId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta exitosa** (200):

```json
{
  "quotes": {
    "total": 150,
    "byStatus": {
      "draft": 30,
      "sent": 40,
      "approved": 60,
      "rejected": 10,
      "in_progress": 8,
      "completed": 2
    },
    "approved": 60,
    "conversionRate": 40.0
  },
  "projects": {
    "total": 45,
    "byStatus": {
      "pending": 5,
      "in_progress": 30,
      "on_hold": 3,
      "completed": 7,
      "cancelled": 0
    }
  },
  "payments": {
    "total": 120,
    "totalRevenue": 1250000
  },
  "invoices": {
    "total": 20,
    "byStatus": { "sent": 10, "paid": 10 },
    "totalBilled": 150000,
    "totalCollected": 100000,
    "totalPending": 50000
  }
}
```

---

### GET `/kpi/sales-dashboard`

Endpoint especializado para el Administrador que consolida métricas críticas de ventas, conversión y eficiencia operativa (pipeline, conversión, ticket promedio y tiempos por etapa).

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, requerido): ID de la compañía.
- `userId` (string, opcional): Filtrar por estimador.
- `startDate` (string, opcional): Fecha inicio (ISO 8601).
- `endDate` (string, opcional): Fecha fin (ISO 8601).

**Respuesta exitosa** (200):

```json
{
  "revenue": 1250000,
  "pipeline": {
    "draft": 30,
    "sent": 40,
    "approved": 60,
    "rejected": 10,
    "in_progress": 8,
    "completed": 2
  },
  "conversionRate": 40.0,
  "averageTicket": 20833.33,
  "timesPerStage": {
    "quote": {
      "draft": 2.5,
      "sent": 5.2,
      "approved": 1.4
    },
    "project": {
      "pending": 3.1,
      "in_progress": 15.4
    }
  }
}
```

> **Nota**: Los tiempos por etapa se devuelven en **días promedio**.

---

### GET `/kpi/quotes`

Obtiene KPIs específicos de cotizaciones. Admite los mismos filtros: `companyId`, `userId`, `startDate`, `endDate`.

---

### GET `/kpi/projects`

Obtiene KPIs específicos de proyectos. Admite los mismos filtros: `companyId`, `userId`, `startDate`, `endDate`.

---

### GET `/kpi/payments`

Obtiene KPIs específicos de pagos. Admite los mismos filtros: `companyId`, `userId`, `startDate`, `endDate`.

---

### GET `/kpi/invoices`

Obtiene KPIs específicos de facturación. Admite los mismos filtros: `companyId`, `userId`, `startDate`, `endDate`.

---

## Subida de Archivos

### POST `/upload/presigned-url`

Genera una URL presignada para subir un archivo directamente a S3 desde el cliente (Angular). Este es el método recomendado para archivos grandes o videos.

**Autenticación**: No especificada

**Body**:

```json
{
  "fileName": "string (requerido, nombre del archivo con extensión)",
  "contentType": "string (opcional, tipo MIME del archivo, ej: video/mp4, image/jpeg)"
}
```

**Ejemplo**:

```json
{
  "fileName": "video.mp4",
  "contentType": "video/mp4"
}
```

**Respuesta exitosa** (200):

```json
{
  "presignedUrl": "https://bucket.s3.amazonaws.com/1234567890-video.mp4?X-Amz-Algorithm=...&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=3600&X-Amz-Signature=...",
  "publicUrl": "https://bucket.s3.amazonaws.com/1234567890-video.mp4",
  "key": "1234567890-video.mp4"
}
```

**Flujo de uso**:

1. **Angular**: El usuario selecciona un archivo
2. **Angular → NestJS**: Solicita una URL presignada con `POST /upload/presigned-url` enviando `fileName` y opcionalmente `contentType`
3. **NestJS → AWS**: Genera una URL presignada con permiso PUT (válida por 1 hora por defecto)
4. **NestJS → Angular**: Devuelve la URL presignada y la URL pública final
5. **Angular → S3**: Hace un PUT directo a la URL presignada con el archivo usando `fetch` o `HttpClient`

**Ejemplo en Angular**:

```typescript
// 1. Solicitar URL presignada
const response = await this.http
  .post('/upload/presigned-url', {
    fileName: file.name,
    contentType: file.type,
  })
  .toPromise()

const { presignedUrl, publicUrl } = response

// 2. Subir archivo directamente a S3
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
})

// 3. Usar publicUrl para guardar en la base de datos
console.log('Archivo subido:', publicUrl)
```

**Ventajas**:

- ✅ Acepta cualquier tipo de archivo (sin restricciones)
- ✅ No hay límite de tamaño (el límite lo maneja S3)
- ✅ La carga es directa desde el cliente a S3 (no pasa por el servidor NestJS)
- ✅ Reduce la carga en el servidor backend
- ✅ Ideal para archivos grandes y videos

---

### POST `/upload`

Sube un archivo (imagen, video o audio) al sistema a través del servidor NestJS.

**Autenticación**: No especificada

**Content-Type**: `multipart/form-data`

**Body** (FormData):

- `file` (File, requerido): Archivo a subir

**Límites**:

- Tamaño máximo: 10MB
- Tipos permitidos: jpg, jpeg, png, gif, webp, bmp, svg, tiff, mp4, mov, avi, mkv, webm, mpeg, mpg, m4v, 3gp, 3g2, flv, wmv, ts, m2ts, ogv, mp3, wav, aac, ogg, m4a, flac, wma, aiff, opus

**Respuesta exitosa** (201):

```json
{
  "url": "https://bucket.s3.amazonaws.com/1234567890-filename.jpg"
}
```

**Nota**: Para archivos grandes o videos, se recomienda usar `POST /upload/presigned-url` en su lugar.

---

### DELETE `/upload/:key`

Elimina un archivo del sistema usando su clave (key).

**Autenticación**: No especificada

---

## Audio

### POST `/audio/summarize`

Procesa un archivo de audio y genera un resumen usando OpenAI Whisper.

**Autenticación**: No especificada

**Content-Type**: `multipart/form-data`

**Body** (FormData):

- `audio` (File, requerido): Archivo de audio a procesar

**Límites**:

- Tamaño máximo: 25MB
- Tipos permitidos: audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/ogg, audio/webm, audio/mp4

**Respuesta exitosa** (200):

```json
{
  "success": true,
  "data": {
    "transcription": "Texto transcrito del audio...",
    "summary": "Resumen del audio..."
  },
  "message": "Audio procesado y resumido exitosamente"
}
```

---

## Logs

El módulo de logs permite registrar y consultar notificaciones y errores de la plataforma. Los logs pueden estar asociados a compañías y usuarios, y permiten un seguimiento detallado de eventos del sistema.

### POST `/log`

Crea un nuevo log (notificación o error) en el sistema.

**Autenticación**: No especificada

**Body**:

```json
{
  "type": "notification | error (requerido)",
  "severity": "low | medium | high | critical (opcional, requerido si type es error)",
  "message": "string (requerido, máximo 500 caracteres)",
  "description": "string (opcional, máximo 2000 caracteres)",
  "companyId": "string (opcional, MongoDB ObjectId)",
  "userId": "string (opcional, MongoDB ObjectId)",
  "source": "string (opcional, origen del log)",
  "stackTrace": "string (opcional, stack trace para errores)",
  "metadata": "object (opcional, datos adicionales)",
  "endpoint": "string (opcional, endpoint HTTP relacionado)",
  "method": "string (opcional, método HTTP)",
  "statusCode": "number (opcional, código de estado HTTP)",
  "ipAddress": "string (opcional)",
  "userAgent": "string (opcional)",
  "resolved": "boolean (opcional, default: false)",
  "resolvedAt": "Date (opcional)",
  "resolvedBy": "string (opcional, MongoDB ObjectId)"
}
```

**Ejemplo de log de error**:

```json
{
  "type": "error",
  "severity": "high",
  "message": "Error al procesar pago",
  "description": "Fallo en la conexión con el proveedor de pagos",
  "companyId": "507f1f77bcf86cd799439011",
  "source": "payment-service",
  "stackTrace": "Error: Connection timeout\n    at PaymentService.processPayment...",
  "metadata": {
    "paymentId": "123",
    "amount": 1000,
    "customerId": "507f1f77bcf86cd799439013"
  },
  "endpoint": "/payment/create-intent",
  "method": "POST",
  "statusCode": 500,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Ejemplo de notificación**:

```json
{
  "type": "notification",
  "message": "Cotización aprobada",
  "description": "La cotización #123 ha sido aprobada por el cliente",
  "companyId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "source": "quote-service",
  "metadata": {
    "quoteId": "507f1f77bcf86cd799439014",
    "projectId": "507f1f77bcf86cd799439015"
  }
}
```

**Respuesta exitosa** (201):

```json
{
  "_id": "log_id",
  "type": "error",
  "severity": "high",
  "message": "Error al procesar pago",
  "description": "Fallo en la conexión con el proveedor de pagos",
  "companyId": "507f1f77bcf86cd799439011",
  "source": "payment-service",
  "resolved": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET `/log`

Obtiene todos los logs con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `type` (string, opcional): Filtrar por tipo (`notification` o `error`)
- `severity` (string, opcional): Filtrar por severidad (`low`, `medium`, `high`, `critical`)
- `companyId` (string, opcional): Filtrar por compañía
- `userId` (string, opcional): Filtrar por usuario
- `source` (string, opcional): Filtrar por origen
- `resolved` (string, opcional): Filtrar por estado de resolución (`true` o `false`)
- `startDate` (string, opcional): Fecha de inicio (formato ISO 8601)
- `endDate` (string, opcional): Fecha de fin (formato ISO 8601)
- `limit` (number, opcional): Límite de resultados (default: 100)
- `skip` (number, opcional): Número de resultados a omitir (default: 0)

**Ejemplo**:

```
GET /log?type=error&severity=critical&companyId=507f1f77bcf86cd799439011&resolved=false&limit=50
```

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "log_id",
    "type": "error",
    "severity": "critical",
    "message": "Error crítico en el sistema",
    "companyId": "507f1f77bcf86cd799439011",
    "resolved": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    ...
  }
]
```

---

### GET `/log/errors`

Obtiene solo los logs de tipo error con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `severity` (string, opcional): Filtrar por severidad
- `companyId` (string, opcional): Filtrar por compañía
- `userId` (string, opcional): Filtrar por usuario
- `source` (string, opcional): Filtrar por origen
- `resolved` (string, opcional): Filtrar por estado de resolución
- `limit` (number, opcional): Límite de resultados
- `skip` (number, opcional): Número de resultados a omitir

**Ejemplo**:

```
GET /log/errors?severity=high&resolved=false&limit=20
```

---

### GET `/log/notifications`

Obtiene solo los logs de tipo notificación con filtros opcionales.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar por compañía
- `userId` (string, opcional): Filtrar por usuario
- `source` (string, opcional): Filtrar por origen
- `limit` (number, opcional): Límite de resultados
- `skip` (number, opcional): Número de resultados a omitir

**Ejemplo**:

```
GET /log/notifications?companyId=507f1f77bcf86cd799439011&limit=50
```

---

### GET `/log/unresolved-errors`

Obtiene solo los errores que no han sido resueltos.

**Autenticación**: No especificada

**Query Parameters**:

- `severity` (string, opcional): Filtrar por severidad
- `companyId` (string, opcional): Filtrar por compañía
- `userId` (string, opcional): Filtrar por usuario
- `source` (string, opcional): Filtrar por origen
- `limit` (number, opcional): Límite de resultados
- `skip` (number, opcional): Número de resultados a omitir

**Ejemplo**:

```
GET /log/unresolved-errors?severity=critical&companyId=507f1f77bcf86cd799439011
```

**Respuesta exitosa** (200):

```json
[
  {
    "_id": "log_id",
    "type": "error",
    "severity": "critical",
    "message": "Error crítico en el sistema",
    "resolved": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    ...
  }
]
```

---

### GET `/log/stats`

Obtiene estadísticas agregadas de los logs.

**Autenticación**: No especificada

**Query Parameters**:

- `companyId` (string, opcional): Filtrar estadísticas por compañía
- `startDate` (string, opcional): Fecha de inicio (formato ISO 8601)
- `endDate` (string, opcional): Fecha de fin (formato ISO 8601)

**Ejemplo**:

```
GET /log/stats?companyId=507f1f77bcf86cd799439011&startDate=2024-01-01&endDate=2024-01-31
```

**Respuesta exitosa** (200):

```json
{
  "total": 150,
  "errors": 45,
  "notifications": 105,
  "bySeverity": {
    "low": 10,
    "medium": 15,
    "high": 15,
    "critical": 5
  },
  "unresolved": 12
}
```

---

### GET `/log/company/:companyId`

Obtiene todos los logs de una compañía específica.

**Autenticación**: No especificada

**Parámetros**:

- `companyId` (string, requerido): ID de la compañía

**Query Parameters**:

- `type` (string, opcional): Filtrar por tipo
- `severity` (string, opcional): Filtrar por severidad
- `limit` (number, opcional): Límite de resultados
- `skip` (number, opcional): Número de resultados a omitir

**Ejemplo**:

```
GET /log/company/507f1f77bcf86cd799439011?type=error&severity=high
```

---

### GET `/log/user/:userId`

Obtiene todos los logs de un usuario específico.

**Autenticación**: No especificada

**Parámetros**:

- `userId` (string, requerido): ID del usuario

**Query Parameters**:

- `type` (string, opcional): Filtrar por tipo
- `severity` (string, opcional): Filtrar por severidad
- `limit` (number, opcional): Límite de resultados
- `skip` (number, opcional): Número de resultados a omitir

**Ejemplo**:

```
GET /log/user/507f1f77bcf86cd799439012?type=notification
```

---

### GET `/log/:id`

Obtiene un log específico por su ID.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID del log

**Respuesta exitosa** (200):

```json
{
  "_id": "log_id",
  "type": "error",
  "severity": "high",
  "message": "Error al procesar pago",
  "description": "Fallo en la conexión con el proveedor de pagos",
  "companyId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "source": "payment-service",
  "stackTrace": "Error: Connection timeout...",
  "metadata": {
    "paymentId": "123",
    "amount": 1000
  },
  "endpoint": "/payment/create-intent",
  "method": "POST",
  "statusCode": 500,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "resolved": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PATCH `/log/:id`

Actualiza un log existente.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID del log

**Body**: Todos los campos son opcionales (mismo formato que POST `/log`)

**Ejemplo**:

```json
{
  "resolved": true,
  "description": "Error resuelto mediante reinicio del servicio"
}
```

**Nota**: Si se establece `resolved: true` sin especificar `resolvedAt`, se establece automáticamente la fecha actual.

---

### PATCH `/log/:id/resolve`

Marca un log como resuelto. Endpoint específico para resolver logs de manera rápida.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID del log

**Body**:

```json
{
  "resolvedBy": "string (opcional, MongoDB ObjectId del usuario que resuelve)"
}
```

**Ejemplo**:

```json
{
  "resolvedBy": "507f1f77bcf86cd799439012"
}
```

**Respuesta exitosa** (200):

```json
{
  "_id": "log_id",
  "resolved": true,
  "resolvedAt": "2024-01-01T12:00:00.000Z",
  "resolvedBy": "507f1f77bcf86cd799439012",
  ...
}
```

---

### DELETE `/log/:id`

Elimina un log del sistema.

**Autenticación**: No especificada

**Parámetros**:

- `id` (string, requerido): ID del log

**Respuesta exitosa** (200):

```json
{
  "_id": "log_id",
  "type": "error",
  "message": "Error al procesar pago",
  ...
}
```

---

## General

### GET `/`

Endpoint de salud/verificación del servidor.

**Autenticación**: No requerida

**Respuesta exitosa** (200):

```
"Hello World!"
```

---

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Error en la solicitud (validación, datos inválidos)
- `401 Unauthorized`: No autenticado o token inválido
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

---

## Autenticación con JWT

Para endpoints que requieren autenticación, incluye el token JWT en el header:

```
Authorization: Bearer {jwt_token}
```

El token se obtiene al hacer login o registro exitoso en los endpoints de autenticación.

---

## Notas Importantes

1. **Flujo de Trabajo**: **Primero se crea el proyecto**, luego se pueden crear múltiples estimaciones (quotes) para ese proyecto. El flujo es: Proyecto → Estimaciones → Aprobación → Inicio de Proyecto.

2. **Sistema de Compañías**: Todos los recursos principales (cotizaciones, proyectos, pagos) están asociados a una compañía. Use el parámetro `companyId` para filtrar datos por compañía.

3. **Sistema de Versiones**: Cada cotización posee un `versionNumber`. Puedes actualizarla vía `PATCH /quote/:id` (incrementando manualmente el número) y consultar el historial con `GET /quote/project/:projectId/versions`.

4. **Validación**: Todos los endpoints utilizan `ValidationPipe` de NestJS que:

   - Elimina propiedades no decoradas en los DTOs (`whitelist: true`)
   - Transforma automáticamente los datos (`transform: true`)

5. **CORS**: La API tiene CORS habilitado, permitiendo solicitudes desde cualquier origen.

6. **Formato de Fechas**: Las fechas se manejan en formato ISO 8601 (UTC).

7. **ObjectId de MongoDB**: Los IDs de MongoDB son strings que representan ObjectIds. Asegúrate de usar el formato correcto (24 caracteres hexadecimales).

8. **Categorías de Cotizaciones**: Las cotizaciones pueden ser `kitchen`, `bathroom`, `basement` o `additional-work`. Cada tipo tiene campos dedicados (`kitchenInformation`, `bathroomInformation`, `basementInformation`, `additionalWorkInformation`) con nombres estandarizados.

9. **Estados de Cotizaciones**: `draft`, `pending`, `approved`, `sent`, `rejected`, `in_progress`, `completed`

   - **Flujo de aprobación**: `draft` → `pending` → `approved` → `sent`
   - **Rechazo**: `pending` → `rejected` (requiere `rejectionComments.comment`)
   - **Reintento**: `rejected` → `draft` o `pending`

10. **Estados de Proyectos**: `pending`, `in_progress`, `on_hold`, `completed`, `cancelled`

11. **Estados de Pagos**: `pending`, `completed`, `failed`, `refunded`

12. **Relación Proyecto-Cotización**: Cada cotización debe tener un `projectId` válido. El sistema valida que el proyecto exista y que pertenezca a la misma compañía antes de crear la cotización.

13. **Lista de Materiales (`materials`)**: El campo `materials` es opcional y es un objeto que puede contener:
    - **`file` (string, opcional)**: URL de una imagen o PDF que contiene la lista de materiales
    - **`items` (array, opcional)**: Array de objetos donde cada objeto tiene `quantity` (número) y `description` (string) para cada material ingresado manualmente
    - Puedes usar `file`, `items`, o ambos simultáneamente según tus necesidades

---

## Ejemplos de Uso

### Flujo Completo: Proyecto → Cotizaciones → Aprobación

```javascript
// 1. PRIMER PASO: Crear el proyecto
const projectResponse = await fetch('/project', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Remodelación Cocina - Juan Pérez',
    description: 'Remodelación completa de cocina residencial',
    companyId: '507f1f77bcf86cd799439011',
    customerId: '507f1f77bcf86cd799439013',
    estimatorId: '507f1f77bcf86cd799439011',
    status: 'pending',
  }),
})

const project = await projectResponse.json()

// 2. SEGUNDO PASO: Crear primera estimación para el proyecto
const quoteResponse = await fetch('/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: '507f1f77bcf86cd799439013', // ✅ ID del cliente
    companyId: '507f1f77bcf86cd799439011',
    projectId: project._id, // ✅ Asociar al proyecto creado
    category: 'kitchen',
    experience: '5 años',
    versionNumber: 1,
    totalPrice: 50000,
    userId: '507f1f77bcf86cd799439011',
    status: 'draft',
    materials: {
      items: [
        { quantity: 10, description: 'Madera de roble para gabinetes' },
        { quantity: 5, description: 'Tornillos de acero inoxidable' },
      ],
    },
  }),
})

const quote = await quoteResponse.json()

// 3. Actualizar la estimación con materiales (usando archivo)
await fetch(`/quote/${quote._id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    materials: {
      file: 'https://bucket.s3.amazonaws.com/materials-list.pdf',
    },
    totalPrice: 55000,
    status: 'sent',
    notes: 'Versión actualizada con materiales premium',
  }),
})

// Alternativa: Actualizar con materiales como items (ingreso manual)
await fetch(`/quote/${quote._id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    materials: {
      items: [
        { quantity: 15, description: 'Madera de roble para gabinetes' },
        { quantity: 8, description: 'Tornillos de acero inoxidable' },
        { quantity: 2, description: 'Bisagras de cierre suave' },
      ],
    },
    versionNumber: 2,
    totalPrice: 55000,
    status: 'sent',
  }),
})

// 4. Obtener todas las estimaciones del proyecto
const projectQuotes = await fetch(`/quote/project/${project._id}`)

// 5. Cuando se aprueba una estimación, asociarla al proyecto
await fetch(`/quote/${quote._id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status: 'approved' }),
})

// 6. Actualizar proyecto con la estimación aprobada
await fetch(`/project/${project._id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    approvedQuoteId: quote._id,
    status: 'in_progress',
  }),
})
```

### Filtrar por Compañía y Proyecto

```javascript
// Obtener todas las cotizaciones de una compañía
const quotes = await fetch('/quote?companyId=507f1f77bcf86cd799439011')

// Obtener todas las estimaciones de un proyecto específico
const projectQuotes = await fetch('/quote/project/507f1f77bcf86cd799439012')

// Obtener KPIs de una compañía específica
const kpis = await fetch('/kpi?companyId=507f1f77bcf86cd799439011')
```

---

## Facturación (Invoices)

### POST `/invoice`

Genera una nueva factura a partir de una cotización aprobada. Permite definir un plan de pagos (pagos parciales).

**Autenticación**: Requerida

**Body**:

```json
{
  "quoteId": "string (requerido, MongoDB ObjectId)",
  "paymentPlan": [
    {
      "name": "string (ej: 'Anticipo')",
      "percentage": "number (ej: 50)",
      "dueDate": "Date (opcional)"
    },
    {
      "name": "string (ej: 'Pago Final')",
      "percentage": "number (ej: 50)",
      "dueDate": "Date (opcional)"
    }
  ],
  "notes": "string (opcional)"
}
```

**Validación**: Los porcentajes en `paymentPlan` deben sumar exactamente 100.

**Respuesta exitosa** (201):

```json
{
  "_id": "invoice_id",
  "invoiceNumber": "INV-1700000000-123",
  "totalAmount": 50000,
  "paidAmount": 0,
  "status": "sent",
  "paymentPlan": [
    {
      "name": "Anticipo",
      "percentage": 50,
      "amount": 25000,
      "status": "pending"
    },
    ...
  ]
}
```

---

### GET `/invoice`

Obtiene facturas filtradas.

**Query Parameters**:

- `companyId`: Filtrar por compañía.
- `projectId`: Filtrar por proyecto.

---

### GET `/invoice/:id`

Obtiene el detalle de una factura.

---

## Pagos (Payments)

Esta API utiliza **Stripe** para procesar pagos.

### POST `/payment/create-intent`

Inicia un intento de pago con Stripe. Retorna el `client_secret` necesario para que el frontend procese la tarjeta.

**Body**:

```json
{
  "invoiceId": "string (requerido)",
  "amount": "number (requerido, monto a pagar en USD)",
  "installmentIndex": "number (opcional, índice de la cuota que se está pagando)"
}
```

**Respuesta exitosa** (201):

```json
{
  "clientSecret": "pi_3M9...",
  "id": "pi_3M9..."
}
```

---

### POST `/payment/confirm`

Confirma al backend que el pago fue exitoso en Stripe, registra la transacción en la base de datos y actualiza el estado de la factura.

**Body**:

```json
{
  "paymentIntentId": "string (requerido, ID retornado por Stripe)",
  "invoiceId": "string (requerido)",
  "installmentIndex": "number (opcional)"
}
```

**Respuesta exitosa** (201):

```json
{
  "_id": "payment_id",
  "status": "completed",
  "amount": 25000,
  ...
}
```

---

### GET `/payment/invoice/:id`

Obtiene el historial de pagos de una factura específica.

---

**Última actualización**: 28 de Enero de 2026

**Endpoints añadidos recientemente**:

- `POST /auth/register/request-code` – Solicitar código de verificación para registro.
- `POST /auth/register/confirm` – Confirmar código y completar registro.
- `DELETE /auth/account` – Borrado físico de la cuenta (requiere JWT).
- `POST /auth/account/anonymize` – Anonimización de la cuenta (requiere JWT).

---

## Historial de Estados y Auditoría

El sistema registra automáticamente cada cambio de estado en cotizaciones y proyectos. Esto permite:

1. Calcular el **tiempo promedio por etapa** en el dashboard de ventas.
2. Auditar quién realizó cada cambio y cuándo.
3. Analizar cuellos de botella en el proceso comercial.

Cada vez que se crea o actualiza el estado de una `Quote` o un `Project`, se genera una entrada en el historial con el timestamp, el estado origen, el estado destino y el usuario responsable.
