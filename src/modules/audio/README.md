# AudioModule

Este módulo proporciona funcionalidad para transcribir archivos de audio y generar resúmenes usando OpenAI Whisper y LangChain.

## Configuración

### Variables de Entorno Requeridas

Asegúrate de tener las siguientes variables de entorno configuradas en tu archivo `.env`:

```env
OPENAI_API_KEY=tu_clave_de_api_de_openai_aqui
```

### Dependencias Instaladas

Las siguientes dependencias ya han sido instaladas:

- `openai`: Cliente oficial de OpenAI para transcripción
- `@langchain/openai`: Integración de LangChain con OpenAI
- `langchain`: Framework para aplicaciones con LLM
- `multer`: Middleware para manejo de archivos
- `@types/multer`: Tipos de TypeScript para Multer

## Uso

### Endpoint

**POST** `/audio/summarize`

### Parámetros

- `audio`: Archivo de audio (multipart/form-data)
  - Formatos soportados: mp3, wav, m4a, ogg, webm, mp4
  - Tamaño máximo: 25MB

### Respuesta

```json
{
  "success": true,
  "data": {
    "summary": "Resumen del contenido del audio..."
  },
  "message": "Audio procesado y resumido exitosamente"
}
```

### Ejemplo de uso con curl

```bash
curl -X POST http://localhost:3000/audio/summarize \
  -F "audio=@/path/to/your/audio/file.mp3"
```

## Funcionalidades

1. **Transcripción**: Utiliza OpenAI Whisper para convertir audio a texto
2. **Resumen**: Genera un resumen del texto usando LangChain con GPT-3.5-turbo
3. **Validación**: Valida formato y tamaño del archivo
4. **Logging**: Registra el progreso del procesamiento
5. **Manejo de errores**: Proporciona mensajes de error descriptivos

## Arquitectura

- **AudioController**: Maneja las peticiones HTTP y validación de archivos
- **AudioService**: Contiene la lógica de negocio para transcripción y resumen
- **AudioModule**: Configura las dependencias del módulo
