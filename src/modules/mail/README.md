# MailModule

Este módulo proporciona funcionalidad para enviar correos electrónicos usando SMTP.

## Configuración

### Variables de Entorno Requeridas

Asegúrate de tener las siguientes variables de entorno configuradas en tu archivo `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_contraseña_de_aplicación
SMTP_FROM=BA <tu_email@gmail.com>  # Opcional
```

## Configuración para Gmail

Gmail requiere el uso de **Contraseñas de aplicación** en lugar de tu contraseña normal. Sigue estos pasos:

### Paso 1: Activar verificación en 2 pasos

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Navega a **Seguridad**
3. Activa la **Verificación en 2 pasos** si no está activada

### Paso 2: Generar contraseña de aplicación

1. En la sección **Seguridad**, busca **Contraseñas de aplicaciones**
2. Si no la ves, ve a: https://myaccount.google.com/apppasswords
3. Selecciona **Correo** como aplicación
4. Selecciona **Otro (nombre personalizado)** como dispositivo y escribe "BA Backend"
5. Haz clic en **Generar**
6. Copia la contraseña de 16 caracteres que se genera (sin espacios)

### Paso 3: Configurar variables de entorno

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@gmail.com
SMTP_PASS=abcdefghijklmnop  # La contraseña de aplicación de 16 caracteres
SMTP_FROM=BA <tu_email@gmail.com>
```

**Importante:**
- `SMTP_USER` debe ser tu email completo (ej: `tuemail@gmail.com`)
- `SMTP_PASS` debe ser la contraseña de aplicación de 16 caracteres (NO tu contraseña normal)
- `SMTP_SECURE` debe ser `false` para el puerto 587
- `SMTP_PORT` debe ser `587` (TLS) o `465` (SSL, requiere `SMTP_SECURE=true`)

## Configuración para otros proveedores SMTP

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_email@outlook.com
SMTP_PASS=tu_contraseña
```

### SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=tu_api_key_de_sendgrid
```

### Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@tu_dominio.mailgun.org
SMTP_PASS=tu_contraseña_de_mailgun
```

## Uso

### Enviar correo genérico

```typescript
await mailService.sendMail({
  to: 'destinatario@example.com',
  subject: 'Asunto del correo',
  html: '<p>Contenido HTML</p>',
  text: 'Contenido en texto plano', // Opcional
});
```

### Enviar credenciales de bienvenida

```typescript
await mailService.sendCustomerWelcomeCredentials({
  to: 'nuevo_usuario@example.com',
  name: 'Juan Pérez', // Opcional
  tempPassword: 'password123',
});
```

### Enviar código de restablecimiento de contraseña

```typescript
await mailService.sendPasswordResetCode({
  to: 'usuario@example.com',
  name: 'Juan Pérez', // Opcional
  code: '123456',
  expiresInMinutes: 15,
});
```

## Manejo de Errores

El servicio incluye manejo mejorado de errores que proporciona mensajes claros:

- **Error de autenticación (EAUTH)**: Proporciona instrucciones específicas para Gmail sobre cómo generar contraseñas de aplicación
- **Error de conexión**: Indica problemas con host o puerto
- **Validación automática**: En desarrollo, valida la conexión SMTP al inicializar

## Solución de Problemas

### Error: "Username and Password not accepted"

**Causa común:** Estás usando tu contraseña normal en lugar de una contraseña de aplicación.

**Solución:**
1. Verifica que hayas generado una contraseña de aplicación en Google
2. Asegúrate de usar esa contraseña de 16 caracteres en `SMTP_PASS`
3. Verifica que `SMTP_USER` sea tu email completo

### Error: "Connection timeout"

**Causa común:** Problemas de red o configuración incorrecta del puerto.

**Solución:**
1. Verifica que el puerto no esté bloqueado por firewall
2. Para Gmail, usa puerto `587` con `SMTP_SECURE=false`
3. Si usas puerto `465`, cambia `SMTP_SECURE=true`

### Error: "Invalid login" en Gmail

**Causa común:** La verificación en 2 pasos no está activada o la contraseña de aplicación es incorrecta.

**Solución:**
1. Activa la verificación en 2 pasos en tu cuenta de Google
2. Genera una nueva contraseña de aplicación
3. Asegúrate de copiar la contraseña completa sin espacios

## Arquitectura

- **MailService**: Contiene la lógica de negocio para envío de correos
- **MailModule**: Configura las dependencias del módulo
- **Nodemailer**: Biblioteca utilizada para el envío de correos SMTP

## Características

- ✅ Detección automática de Gmail
- ✅ Configuración optimizada para Gmail
- ✅ Validación de conexión en desarrollo
- ✅ Mensajes de error descriptivos y útiles
- ✅ Soporte para múltiples proveedores SMTP
- ✅ Templates predefinidos para casos comunes




