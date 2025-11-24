# Contexto General de la Plataforma BA

## Descripción General

BA es una plataforma digital diseñada para gestionar el proceso completo de estimaciones, cotizaciones y seguimiento de proyectos de construcción y remodelación para el grupo de empresas **BA** (Business Applications). La plataforma está especializada en tres tipos principales de proyectos:

- **Cocinas**: Remodelaciones y construcciones de cocinas completas
- **Baños**: Remodelaciones y construcciones de baños
- **Otros**: Proyectos diversos de construcción y remodelación

La plataforma facilita la comunicación y gestión entre clientes, estimadores y administradores, proporcionando herramientas para crear cotizaciones detalladas, hacer seguimiento de proyectos y gestionar pagos.

**Característica Principal**: La plataforma gestiona múltiples compañías de forma independiente, permitiendo que cada usuario seleccione la compañía con la que trabajará después de iniciar sesión. Todos los proyectos, cotizaciones y datos están organizados por compañía, garantizando la separación y organización de la información.

---

## Objetivos de la Plataforma

1. **Digitalizar el proceso de cotización**: Transformar el proceso tradicional de estimaciones en un flujo digital eficiente y estructurado.

2. **Mejorar la comunicación**: Facilitar la comunicación entre clientes y estimadores, manteniendo un registro centralizado de todas las interacciones.

3. **Transparencia en el seguimiento**: Permitir a los clientes hacer seguimiento en tiempo real del estado de sus proyectos.

4. **Gestión de pagos**: Facilitar el registro y seguimiento de pagos completos y parciales por proyecto.

5. **Análisis y KPIs**: Proporcionar a los administradores métricas y análisis para la toma de decisiones estratégicas.

6. **Gestión de usuarios**: Centralizar la administración de usuarios, roles y permisos en la plataforma.

---

## Compañías del Grupo BA

La plataforma gestiona tres compañías independientes dentro del grupo BA, cada una con su propio conjunto de proyectos, cotizaciones y datos:

### 1. BA Kitchen & Bath Design

Especializada en diseño, construcción y remodelación de cocinas y baños. Esta compañía se enfoca en proyectos completos de diseño e instalación de espacios residenciales y comerciales.

**Servicios principales**:

- Diseño de cocinas y baños
- Remodelaciones completas
- Instalación de gabinetes y accesorios
- Trabajos de plomería y electricidad
- Acabados y pintura

### 2. BA Stones Surfaces

Especializada en superficies de piedra natural y sintética, incluyendo encimeras, backsplashes y acabados en piedra.

**Servicios principales**:

- Instalación de encimeras de cuarzo, granito y mármol
- Backsplashes en piedra
- Superficies de piedra para baños
- Acabados y pulidos especializados

### 3. BA Stones Surfaces

_Nota: Esta compañía aparece duplicada en la lista. Se recomienda verificar si corresponde a una tercera compañía diferente o si es una variación de BA Stones Surfaces._

---

## Sistema de Compañías y Contexto de Trabajo

### Selección de Compañía

Después de iniciar sesión, todos los usuarios (clientes, estimadores y administradores) deben **seleccionar una compañía** con la que trabajarán durante su sesión. Esta selección determina el contexto de todas las operaciones posteriores.

### Independencia de Datos por Compañía

**Características clave**:

1. **Aislamiento de Datos**: Cada compañía mantiene sus datos completamente separados:

   - Proyectos y estimaciones son independientes por compañía
   - Clientes pueden tener proyectos en diferentes compañías
   - Cotizaciones están asociadas a una compañía específica
   - Reportes y estadísticas se generan por compañía

2. **Contexto de Sesión**: Una vez seleccionada una compañía:

   - Todas las cotizaciones creadas pertenecen a esa compañía
   - Todos los proyectos visibles son de esa compañía
   - Los filtros y búsquedas se aplican dentro del contexto de la compañía seleccionada
   - Los KPIs y métricas mostradas corresponden a esa compañía

3. **Cambio de Compañía**: Los usuarios pueden cambiar de compañía en cualquier momento:
   - Al cambiar de compañía, el contexto se actualiza inmediatamente
   - Los datos mostrados cambian según la compañía seleccionada
   - Se mantiene la sesión del usuario, solo cambia el contexto de trabajo

### Flujo de Trabajo con Compañías

1. **Usuario inicia sesión** → Autenticación exitosa
2. **Selección de compañía** → El usuario elige con qué compañía trabajar
3. **Contexto activo** → Todas las operaciones se realizan en el contexto de la compañía seleccionada
4. **Creación de cotizaciones** → Automáticamente asociadas a la compañía activa
5. **Visualización de datos** → Solo se muestran datos de la compañía seleccionada
6. **Cambio de contexto** → El usuario puede cambiar de compañía cuando lo necesite

---

## Tipos de Proyectos

### Cocinas

Proyectos de remodelación y construcción de cocinas que incluyen:

- Instalación de gabinetes y alacenas
- Instalación de electrodomésticos
- Trabajos de plomería y electricidad
- Instalación de encimeras y backsplashes
- Trabajos de pintura y acabados
- Demolición y preparación del espacio

### Baños

Proyectos de remodelación y construcción de baños que incluyen:

- Instalación de sanitarios y accesorios
- Trabajos de plomería y electricidad
- Instalación de azulejos y acabados
- Trabajos de pintura
- Demolición y preparación del espacio

### Otros

Proyectos diversos de construcción y remodelación que no se clasifican en las categorías anteriores.

---

## Perfiles de Usuario

La plataforma cuenta con tres perfiles principales, cada uno con funcionalidades y permisos específicos:

### 👤 Customer (Cliente)

El perfil **customer** representa a los clientes que contratan los servicios de BA. Este perfil se crea automáticamente cuando un usuario se registra en la plataforma.

#### Funcionalidades Principales:

1. **Seguimiento de Proyectos**

   - Visualizar el estado actual de sus proyectos
   - Ver el progreso y actualizaciones en tiempo real
   - Acceder al historial completo de cada proyecto

2. **Gestión de Cotizaciones**

   - Ver todas sus cotizaciones asociadas
   - Consultar detalles completos de cada estimación
   - **Ver todas las versiones de cada estimación**: Acceder al historial completo de versiones de cada propuesta
   - Comparar diferentes versiones de una misma estimación
   - Comparar diferentes cotizaciones
   - Aprobar o rechazar cotizaciones
   - Solicitar cambios adicionales que generan nuevas versiones

3. **Gestión de Pagos**

   - Realizar pagos completos de proyectos
   - Realizar pagos parciales según acuerdos
   - Ver historial de pagos realizados
   - Consultar saldos pendientes
   - Descargar comprobantes de pago

4. **Comunicación**
   - Comunicarse con su estimador asignado
   - Recibir notificaciones sobre actualizaciones de proyectos
   - Solicitar modificaciones o aclaraciones

#### Características Técnicas:

- Se crea automáticamente un role "customer" al registrarse
- Tiene acceso solo a sus propios proyectos y cotizaciones
- Puede ver información relacionada exclusivamente con su cuenta

---

### 📐 Estimator (Estimador)

El perfil **estimator** representa a los profesionales que crean las cotizaciones y estimaciones para los clientes.

#### Funcionalidades Principales:

1. **Creación de Proyectos**

   - Crear proyectos con información básica (nombre, cliente, compañía)
   - Asignar estimador responsable del proyecto
   - Establecer estado inicial del proyecto

2. **Creación de Cotizaciones/Estimaciones**

   La creación de estimaciones se realiza mediante una interfaz con **dos pestañas** que permiten organizar y completar toda la información necesaria:

   **Pestaña 1: Formulario Principal de Estimación**

   - Crear estimaciones detalladas para proyectos existentes
   - Incluir información completa del cliente y la compañía
   - Especificar detalles técnicos del proyecto (dimensiones, materiales, etc.)
   - Calcular costos totales y parciales
   - Agregar información de experiencia y contexto del proyecto
   - **Asociar estimación al proyecto**: Cada estimación debe estar vinculada a un proyecto
   - Este formulario mantiene toda la funcionalidad existente sin modificaciones

   **Pestaña 2: Gestión de Materiales**

   Nueva pestaña dedicada exclusivamente a la gestión de la lista de materiales de la estimación. Los estimadores pueden ingresar los materiales de **dos formas diferentes**:

   - **Subir archivo de imagen**:

     - Permite subir una imagen (JPG, PNG, PDF, etc.) que contenga la lista de materiales
     - El archivo se almacena en S3 y se guarda la URL en el campo `materials.file`
     - Ideal para cuando la lista de materiales ya existe en formato físico o digital
     - Soporta formatos de imagen y PDF

   - **Ingreso manual de materiales**:
     - Permite agregar cada material individualmente con sus detalles
     - Para cada material se especifica:
       - **Cantidad**: Número de unidades del material
       - **Descripción**: Descripción detallada del material
     - Los materiales se guardan en el campo `materials.items` como un array de objetos
     - Permite agregar, editar y eliminar materiales de la lista
     - Ideal para crear listas estructuradas y detalladas desde cero

   **Estructura del campo `materials`**: El campo `materials` es un objeto opcional que puede contener:

   - **`file` (string, opcional)**: URL del archivo subido con la lista de materiales
   - **`items` (array, opcional)**: Array de objetos con `quantity` (número) y `description` (string) para cada material ingresado manualmente

   **Nota**: Puedes usar `file`, `items`, o ambos simultáneamente según tus necesidades. Esto permite flexibilidad para combinar una lista de materiales en archivo con materiales adicionales ingresados manualmente.

3. **Gestión de Cotizaciones**

   - Crear nuevas estimaciones para proyectos existentes
   - **Editar y crear nuevas versiones**: Cada vez que se edita una estimación, se crea automáticamente una nueva versión, manteniendo el historial completo
   - Ver historial de versiones de cada cotización
   - Comparar versiones anteriores con la actual
   - Duplicar cotizaciones para proyectos similares
   - Organizar cotizaciones por proyecto, cliente, categoría o estado
   - Generar reportes de cotizaciones

4. **Seguimiento de Proyectos**

   - Reportar el progreso de los proyectos asignados
   - Actualizar el estado de cada proyecto
   - Registrar hitos y eventos importantes
   - Subir fotos y documentación del avance

5. **Gestión de Clientes**
   - Ver información de clientes asignados
   - Acceder al historial de proyectos por cliente
   - Comunicarse directamente con clientes

#### Características Técnicas:

- Debe crear primero el proyecto antes de crear estimaciones
- Cada cotización debe incluir el `userId` del estimador que la crea
- Cada cotización debe estar asociada a un proyecto mediante `projectId`
- Puede crear múltiples estimaciones para un mismo proyecto
- Tiene acceso a información de clientes y proyectos asignados
- Puede subir archivos multimedia (fotos, videos, audio) relacionados con proyectos

#### Tipos de Cotizaciones:

- **Kitchen Quotes**: Cotizaciones detalladas para proyectos de cocina con más de 400 campos opcionales que incluyen:
  - Dimensiones y medidas del espacio
  - Materiales y acabados
  - Electrodomésticos y accesorios
  - Trabajos de plomería y electricidad
  - Trabajos de pintura y acabados
  - Y muchos más detalles específicos

---

### 👨‍💼 Administrador

El perfil **administrador** tiene acceso completo a la plataforma y puede gestionar todos los aspectos del sistema.

#### Funcionalidades Principales:

1. **Dashboard y KPIs**

   - Visualizar métricas clave de la plataforma
   - **Filtrado por compañía**: Ver KPIs específicos de cada compañía o consolidados
   - Ver estadísticas de proyectos por estado
   - Analizar rendimiento de estimadores
   - Monitorear ingresos y pagos
   - Generar reportes ejecutivos
   - KPIs relevantes incluyen:
     - **KPIs por compañía**:
       - Total de proyectos activos por compañía
       - Proyectos por categoría (Cocinas, Baños, Otros) por compañía
       - Tasa de conversión de cotizaciones por compañía
       - Ingresos totales y pendientes por compañía
       - Rendimiento por estimador por compañía
       - Tiempo promedio de proyectos por compañía
     - **KPIs consolidados**:
       - Total de proyectos activos (todas las compañías)
       - Proyectos por categoría (consolidado)
       - Tasa de conversión global
       - Ingresos totales consolidados
       - Comparativa entre compañías

2. **Gestión de Proyectos**

   - Ver todos los proyectos de todos los clientes
   - **Filtrar por compañía**: Ver proyectos de una compañía específica o todas las compañías
   - Filtrar proyectos por estimador, cliente, categoría o estado
   - Filtrar proyectos por compañía y otros criterios combinados
   - Acceder a detalles completos de cualquier proyecto
   - Modificar estados y asignaciones de proyectos
   - Generar reportes consolidados o por compañía

3. **Gestión de Usuarios**

   - Crear, editar y eliminar usuarios
   - Asignar y modificar roles (customer, estimator, administrador)
   - Gestionar permisos y accesos
   - Ver historial de actividad de usuarios
   - Activar/desactivar cuentas

4. **Gestión de Cotizaciones**

   - Ver todas las cotizaciones del sistema
   - **Filtrar por compañía**: Ver cotizaciones de una compañía específica o todas
   - Filtrar por estimador, cliente, categoría o rango de fechas
   - Filtrar por compañía combinado con otros criterios
   - Analizar tendencias de cotizaciones por compañía
   - Comparar rendimiento de cotizaciones entre compañías
   - Exportar datos para análisis externos (por compañía o consolidado)

5. **Gestión de Pagos**

   - Ver todos los pagos realizados por todos los clientes
   - **Filtrar por compañía**: Ver pagos de una compañía específica o todas
   - Generar reportes de pagos por compañía o consolidados
   - Filtrar pagos por cliente, proyecto, rango de fechas
   - Filtrar pagos por compañía combinado con otros criterios
   - Exportar información financiera por compañía
   - Reconciliar pagos y proyectos por compañía
   - Comparar ingresos entre compañías

6. **Administración del Sistema**
   - Configurar parámetros generales de la plataforma
   - **Gestionar compañías**: Crear, editar y configurar compañías del sistema
   - Gestionar categorías de proyectos
   - Administrar plantillas de cotizaciones (por compañía o globales)
   - Configurar notificaciones y alertas
   - Asignar usuarios a compañías específicas (si aplica)

#### Características Técnicas:

- Acceso completo a todos los recursos del sistema
- Puede realizar operaciones CRUD en todos los módulos
- Tiene permisos especiales para gestión de usuarios y roles
- Puede acceder a datos agregados y estadísticas

---

## Flujos de Trabajo Principales

### Flujo de Cotización

1. **Usuario inicia sesión** → Autenticación exitosa
2. **Selección de compañía** → Usuario (cliente, estimador o administrador) selecciona la compañía con la que trabajará
3. **Cliente se registra** → Se crea automáticamente perfil "customer"
4. **PRIMER PASO: Crear Proyecto** → El estimador crea un proyecto con información básica (nombre, cliente, compañía, estimador)
5. **SEGUNDO PASO: Crear Estimación (Versión 1)** → El estimador crea la primera estimación/cotización asociada al proyecto creado mediante una interfaz con dos pestañas:
   - **Pestaña 1 - Formulario Principal**: Completa toda la información técnica del proyecto (dimensiones, especificaciones, precios, etc.)
   - **Pestaña 2 - Gestión de Materiales**: Ingresa la lista de materiales mediante:
     - Subida de archivo de imagen/PDF con la lista, o
     - Ingreso manual de cada material con cantidad y descripción
6. **Cliente revisa estimación** → Puede ver el detalle completo y todas las versiones disponibles del proyecto (solo de la compañía seleccionada)
7. **Cliente solicita cambios** → Puede aprobar, rechazar o solicitar modificaciones adicionales
8. **Estimador actualiza la estimación** → Al editar, se crea automáticamente una nueva versión (Versión 2, 3, etc.) manteniendo la asociación con el proyecto y la compañía
9. **Cliente revisa nueva versión** → Puede comparar con versiones anteriores y ver los cambios realizados
10. **Proceso iterativo** → El ciclo se repite hasta que el cliente apruebe una versión
11. **Cliente aprueba estimación** → Una vez aprobada una versión, se asocia al proyecto mediante `approvedQuoteId` y el proyecto puede iniciarse (dentro del contexto de la compañía)

### Flujo de Proyecto

1. **Crear Proyecto** → El estimador crea un proyecto con información básica (nombre, cliente, compañía, estimador)
2. **Crear Estimaciones** → Se crean una o múltiples estimaciones (quotes) asociadas al proyecto
3. **Revisión y Aprobación** → El cliente revisa las estimaciones, solicita cambios si es necesario, y aprueba una versión
4. **Asociar Estimación Aprobada** → Cuando se aprueba una estimación, se asocia al proyecto mediante `approvedQuoteId`
5. **Proyecto en Progreso** → El proyecto se marca como "in_progress" cuando hay una estimación aprobada
6. **Estimador reporta avances** → Actualiza estado y sube documentación
7. **Cliente hace seguimiento** → Ve actualizaciones en tiempo real
8. **Pagos se registran** → Cliente realiza pagos completos o parciales
9. **Proyecto completado** → Se marca como finalizado

### Flujo de Administración

1. **Administrador monitorea KPIs** → Revisa métricas del dashboard
2. **Analiza rendimiento** → Evalúa proyectos, estimadores y clientes
3. **Gestiona usuarios** → Crea, modifica o desactiva cuentas
4. **Genera reportes** → Exporta datos para análisis y toma de decisiones

---

## Arquitectura de Datos

### Entidades Principales

1. **Users (Usuarios)**

   - Información básica: email, nombre, contraseña
   - Relación con roles

2. **Roles**

   - Tipos: customer, estimator, administrador
   - Asociado a un usuario mediante `userId` (ObjectId)

3. **Quotes (Cotizaciones/Estimaciones)**

   - Información del cliente y compañía
   - **Asociada a un proyecto**: Cada cotización pertenece a un proyecto específico (`projectId` requerido)
   - Detalles del proyecto (kitchenInformation, materials, etc.)
   - Asociada a un estimador mediante `userId` (ObjectId)
   - **Asociada a una compañía**: Cada cotización pertenece a una compañía específica
   - Categoría: kitchen, bathroom, other
   - Precio total y experiencia
   - **Sistema de versiones**: Cada estimación puede tener múltiples versiones
   - Cada versión mantiene un registro completo de cambios y fecha de creación
   - Las versiones permiten rastrear la evolución de cada propuesta
   - Todas las versiones de una cotización pertenecen al mismo proyecto y compañía
   - **Campo `materials` (opcional)**: Objeto que permite almacenar la lista de materiales de dos formas:
     - **`file` (string, opcional)**: URL del archivo de imagen/PDF con la lista de materiales
     - **`items` (array, opcional)**: Array de objetos cuando se ingresan manualmente, cada objeto contiene `quantity` (número) y `description` (string)
     - Puede contener `file`, `items`, o ambos simultáneamente

4. **Projects (Proyectos)**

   - Información básica del proyecto (nombre, descripción)
   - **Asociado a una compañía**: Cada proyecto pertenece a una compañía específica
   - Asociado a un cliente (`customerId`)
   - Asociado a un estimador (`estimatorId`)
   - **Puede tener múltiples estimaciones**: Un proyecto puede tener varias cotizaciones/estimaciones
   - **Estimación aprobada**: Campo `approvedQuoteId` para asociar la estimación aprobada
   - Estados: pending, in_progress, on_hold, completed, cancelled
   - Milestones, updates, fotos y documentación

5. **Customers (Clientes)**

   - Información de contacto y ubicación
   - Historial de proyectos
   - Puede tener proyectos en múltiples compañías
   - Cada proyecto está asociado a una compañía específica

6. **Companies (Compañías)**

   - Identificador único de compañía
   - Nombre de la compañía
   - Configuración específica de la compañía
   - Asociación con proyectos, cotizaciones y usuarios

7. **Payments (Pagos)** - _Futuro_
   - Asociados a proyectos
   - **Asociados a compañía**: Cada pago pertenece a la compañía del proyecto
   - Montos completos o parciales
   - Fechas y comprobantes
   - Filtrado y reportes por compañía

---

## Sistema de Versiones de Estimaciones

La plataforma implementa un sistema robusto de versiones para las estimaciones y proyectos, permitiendo un control completo del historial de cambios y facilitando la colaboración entre clientes y estimadores.

### Características del Sistema de Versiones

1. **Creación Automática de Versiones**

   - Cada vez que un estimador edita una estimación existente, se crea automáticamente una nueva versión
   - Las versiones anteriores se mantienen intactas y accesibles
   - Cada versión tiene un número secuencial (v1, v2, v3, etc.)

2. **Historial Completo**

   - Todas las versiones de una estimación quedan registradas permanentemente
   - Cada versión incluye:
     - Fecha y hora de creación
     - Usuario que realizó los cambios (estimador)
     - Contenido completo de la estimación en ese momento
     - Estado de la versión (borrador, enviada, aprobada, rechazada)

3. **Visualización para Clientes**

   - Los clientes pueden ver el detalle completo de cada estimación
   - Acceso a todas las versiones de las propuestas enviadas
   - Capacidad de comparar diferentes versiones lado a lado
   - Visualización clara de los cambios entre versiones

4. **Solicitud de Cambios**

   - Los clientes pueden solicitar modificaciones adicionales a cualquier versión
   - Las solicitudes de cambios quedan registradas y asociadas a la versión específica
   - Los estimadores pueden ver qué cambios fueron solicitados y en qué versión

5. **Trazabilidad Completa**
   - Registro completo de quién hizo qué cambios y cuándo
   - Historial de aprobaciones y rechazos por versión
   - Seguimiento de todas las interacciones relacionadas con cada versión

### Beneficios del Sistema de Versiones

- **Transparencia**: Los clientes pueden ver toda la evolución de su estimación
- **Colaboración**: Facilita la comunicación y el proceso iterativo de refinamiento
- **Auditoría**: Registro completo de cambios para cumplimiento y análisis
- **Flexibilidad**: Permite múltiples iteraciones sin perder información previa
- **Comparación**: Facilita la comparación entre diferentes propuestas y versiones

### Flujo de Versiones

1. **Versión Inicial**: El estimador crea la primera versión de la estimación
2. **Revisión del Cliente**: El cliente revisa y puede solicitar cambios
3. **Nueva Versión**: El estimador edita y se crea automáticamente una nueva versión
4. **Comparación**: El cliente puede comparar la nueva versión con las anteriores
5. **Aprobación**: El cliente aprueba una versión específica, que se convierte en la versión final

---

## Tecnologías y Características Técnicas

### Backend

- **Framework**: NestJS
- **Base de Datos**: MongoDB con Mongoose
- **Autenticación**: JWT (JSON Web Tokens) + Passport
- **OAuth**: Integración con Google OAuth
- **Validación**: class-validator y class-transformer
- **Almacenamiento**: AWS S3 (para archivos multimedia)

### Funcionalidades Especiales

- **Procesamiento de Audio**: Integración con OpenAI Whisper para transcripción y resumen de audio
- **Subida de Archivos**: Soporte para imágenes, videos y audio (hasta 10MB para archivos generales, 25MB para audio)
- **Validación Robusta**: Validación automática de todos los datos de entrada
- **CORS Habilitado**: Permite solicitudes desde cualquier origen

---

## Seguridad y Permisos

### Control de Acceso

- **Customer**: Solo puede acceder a sus propios datos
- **Estimator**: Puede crear y gestionar cotizaciones, ver clientes asignados
- **Administrador**: Acceso completo al sistema

### Autenticación

- Registro con email y contraseña (mínimo 6 caracteres)
- Login con credenciales locales
- Login con Google OAuth
- Tokens JWT para sesiones
- Refresh tokens para renovación de sesiones

---

## Sistema de Facturación y Pagos

### Flujo de Facturación

1.  **Generación de Factura**: Una vez aprobada una cotización, el Estimador genera una factura (`Invoice`).
2.  **Plan de Pagos**: Al generar la factura, el Estimador define un plan de pagos dividiendo el total en porcentajes (ej. 50% Anticipo, 50% Final).
3.  **Visualización**: El Cliente puede ver la factura y el desglose de cuotas pendientes.

### Flujo de Pago (Stripe)

1.  **Selección**: El Cliente selecciona qué cuota del plan desea pagar.
2.  **Procesamiento**: El sistema utiliza **Stripe** para procesar el pago de forma segura.
3.  **Confirmación**:
    - Se registra la transacción (`Payment`).
    - Se actualiza el estado de la cuota a `paid`.
    - Se actualiza el monto pagado de la factura.
    - Si se completa el total, la factura pasa a estado `paid`.

---

## Estado Actual del Desarrollo

### Módulos Implementados ✅

- Autenticación y autorización
- Gestión de usuarios y roles
- Gestión de clientes
- Creación y gestión de cotizaciones (especialmente cocinas)
- Subida y gestión de archivos
- Procesamiento de audio

### Funcionalidades Pendientes 🚧

- Sistema de pagos completo (integración con pasarelas)
- Dashboard con KPIs para administradores (interfaz de usuario)
- **Sistema de selección de compañía** (interfaz y lógica de contexto en frontend)
- Sistema de notificaciones
- Reportes y exportación de datos
- Sistema de mensajería entre usuarios
- Comparación visual de versiones de estimaciones

---

## Próximos Pasos Sugeridos

1. **Implementar sistema de pagos**

   - Modelo de datos para pagos
   - Endpoints para registro de pagos
   - Integración con pasarelas de pago (opcional)

2. **Desarrollar dashboard de administración**

   - Componentes de visualización de KPIs
   - Gráficos y métricas
   - Filtros y búsquedas avanzadas

3. **Sistema de seguimiento de proyectos**

   - Estados de proyecto (pendiente, en progreso, completado, etc.)
   - Actualizaciones y hitos
   - Documentación fotográfica

4. **Notificaciones**

   - Notificaciones en tiempo real
   - Emails de actualización
   - Alertas de cambios importantes

5. **Expandir tipos de cotizaciones**

   - DTOs específicos para baños
   - DTOs para otros tipos de proyectos
   - Plantillas reutilizables

6. **Implementar sistema de versiones completo**

   - Modelo de datos para versiones de estimaciones
   - Endpoints para gestión de versiones
   - Funcionalidad de comparación de versiones
   - Visualización de historial de cambios
   - Sistema de aprobación por versión

7. **Implementar sistema de compañías completo**
   - Modelo de datos para compañías
   - Sistema de selección de compañía después del login
   - Contexto de sesión por compañía
   - Asociación de cotizaciones y proyectos con compañías
   - Filtrado por compañía en todos los endpoints
   - KPIs y reportes por compañía
   - Interfaz de usuario para cambio de compañía

---

## Contacto y Soporte

Para más información sobre la plataforma, consulta:

- [Documentación de API](./API_DOCUMENTATION.md)
- Código fuente del proyecto
- Equipo de desarrollo

---

**Última actualización**: 20 de Noviembre de 2025
