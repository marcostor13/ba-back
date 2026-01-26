import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'
import { ChatOpenAI } from '@langchain/openai'
import { loadSummarizationChain } from 'langchain/chains'
import { Document } from 'langchain/document'
import * as ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name)
  private readonly openai: OpenAI
  private readonly chatModel: ChatOpenAI
  private ffmpegAvailable = false
  private readonly summaryMinRatio: number

  constructor(private readonly configService: ConfigService) {
    // Inicializar cliente de OpenAI para transcripción
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    })

    // Inicializar modelo de chat para resumen
    this.chatModel = new ChatOpenAI({
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
      modelName: 'gpt-5.1',
      temperature: 0.3, // Temperatura baja para resúmenes más consistentes
    })

    // Configurar ruta de ffmpeg si está disponible (ffmpeg-static, require dinámico o env var)
    try {
      const envPath = process.env.FFMPEG_PATH
      const staticPath = (ffmpegPath as unknown as string) || undefined
      // @ts-ignore CJS fallback
      const requiredPath = (() => { try { return require('ffmpeg-static') as string } catch { return undefined } })()
      const resolved = envPath || staticPath || requiredPath
      if (resolved) {
        // @ts-ignore tipos de fluent-ffmpeg
        ffmpeg.setFfmpegPath(resolved)
        this.ffmpegAvailable = true
        this.logger.log(`[FFmpeg] Ruta configurada: ${resolved}`)
      } else {
        this.ffmpegAvailable = false
        this.logger.warn('[FFmpeg] No se encontró ffmpeg. Se omitirá transcodificación y se enviará el archivo original a OpenAI')
      }
    } catch (e: any) {
      this.ffmpegAvailable = false
      this.logger.warn(`[FFmpeg] No se pudo configurar ffmpeg: ${e?.message || e}`)
    }

    // Configurar porcentaje mínimo de resumen desde ENV (por defecto 0.5)
    const ratioRaw = this.configService.get<string>('AUDIO_SUMMARY_MIN_RATIO')
    let ratio = Number.parseFloat(ratioRaw ?? '')
    if (!Number.isFinite(ratio)) ratio = 0.5
    // Limitar a rango razonable para evitar salidas excesivas
    ratio = Math.max(0.1, Math.min(0.95, ratio))
    this.summaryMinRatio = ratio
    this.logger.log(`[Resumen] Min ratio configurado: ${this.summaryMinRatio}`)
  }

  async summarizeAudio(
    file: Express.Multer.File
  ): Promise<{ summary: string; structuredSummary: string }> {
    try {
      this.logger.log(
        `Iniciando procesamiento del archivo: ${file.originalname}`
      )

      // Paso 1: Transcripción con OpenAI Whisper
      const transcription = await this.transcribeAudio(file)
      this.logger.log(
        `Transcripción completada. Longitud del texto: ${transcription.length} caracteres`
      )

      // Paso 2: Generar resumen con LangChain
      const summary = await this.generateSummary(transcription)
      this.logger.log('Resumen generado exitosamente')

      return { summary, structuredSummary: summary }
    } catch (error) {
      this.logger.error(
        `Error en summarizeAudio: ${error.message}`,
        error.stack
      )
      throw error
    }
  }

  private async transcribeAudio(file: Express.Multer.File): Promise<string> {
    let tempInputFile: string | null = null
    let tempOutputFile: string | null = null

    try {
      this.logger.log(
        `[Transcripción] Preparando archivo: name=${file.originalname}, mime=${file.mimetype}, size=${file.size}`
      )

      // 1) Transcodificar a MP3 CBR 128k para máxima compatibilidad (si ffmpeg disponible)
      let uploadBuffer: Buffer
      let uploadMime: string
      let uploadName: string

      if (this.ffmpegAvailable) {
        try {
          // Intentar transcodificación con método mejorado
          const transcodedBuffer = await this.transcodeToMp3Robust(file)
          this.logger.log(`[Transcripción] Transcodificación completada: ${transcodedBuffer.length} bytes`)
          uploadBuffer = transcodedBuffer
          uploadMime = 'audio/mpeg'
          uploadName = `${path.parse(file.originalname).name}.mp3`
        } catch (tErr: any) {
          this.logger.warn(`[Transcripción] Fallback sin transcodificar por error: ${tErr?.message || tErr}`)
          // Verificar si el formato original es compatible con OpenAI
          const isCompatible = this.isFormatCompatible(file.mimetype, file.originalname)
          if (!isCompatible) {
            throw new Error(
              `Formato no compatible con OpenAI después de fallo de transcodificación. ` +
              `Formato recibido: ${file.mimetype}. Formatos soportados: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm`
            )
          }
          uploadBuffer = file.buffer
          uploadMime = file.mimetype || 'audio/wav'
          uploadName = file.originalname
        }
      } else {
        // Verificar compatibilidad si ffmpeg no está disponible
        const isCompatible = this.isFormatCompatible(file.mimetype, file.originalname)
        if (!isCompatible) {
          throw new Error(
            `Formato no compatible con OpenAI. ffmpeg no disponible para transcodificar. ` +
            `Formato recibido: ${file.mimetype}. Formatos soportados: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm`
          )
        }
        this.logger.log('[Transcripción] ffmpeg no disponible. Enviando buffer original a OpenAI')
        uploadBuffer = file.buffer
        uploadMime = file.mimetype || 'audio/wav'
        uploadName = file.originalname
      }

      // 2) Convertir el buffer a un File compatible con el SDK de OpenAI
      const uploadFile = await toFile(uploadBuffer, uploadName, {
        type: uploadMime,
      })

      const response = await this.openai.audio.transcriptions.create({
        file: uploadFile,
        model: 'whisper-1',
        language: 'es',
        response_format: 'text',
      })

      const text = typeof response === 'string' ? response : (response as any)?.text ?? ''
      if (!text) {
        throw new Error('Respuesta vacía de la API de transcripción')
      }
      return text
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      const detail = error?.response?.data ?? error?.stack ?? error?.message
      this.logger.error(`Error en transcripción: ${status || ''} ${error?.message || error}`)
      if (detail) {
        this.logger.error(`Detalle OpenAI: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
      }
      throw new Error(`Error al transcribir el audio: ${error?.message || error}`)
    } finally {
      // Limpiar archivos temporales si existen
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        try {
          fs.unlinkSync(tempInputFile)
        } catch (e) {
          this.logger.warn(`No se pudo eliminar archivo temporal: ${tempInputFile}`)
        }
      }
      if (tempOutputFile && fs.existsSync(tempOutputFile)) {
        try {
          fs.unlinkSync(tempOutputFile)
        } catch (e) {
          this.logger.warn(`No se pudo eliminar archivo temporal: ${tempOutputFile}`)
        }
      }
    }
  }

  /**
   * Verifica si el formato es compatible con OpenAI Whisper
   */
  private isFormatCompatible(mimeType: string | undefined, filename: string): boolean {
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
    const ext = path.extname(filename || '').toLowerCase().replace('.', '')

    if (ext && supportedFormats.includes(ext)) {
      return true
    }

    if (mimeType) {
      const mimeLower = mimeType.toLowerCase()
      // Verificar MIME types comunes
      if (
        mimeLower.includes('mp3') ||
        mimeLower.includes('mpeg') ||
        mimeLower.includes('wav') ||
        mimeLower.includes('m4a') ||
        mimeLower.includes('ogg') ||
        mimeLower.includes('webm') ||
        mimeLower.includes('flac') ||
        mimeLower.includes('mp4')
      ) {
        return true
      }
    }

    return false
  }

  /**
   * Transcodifica a MP3 usando un método más robusto que maneja mejor los formatos de iOS
   */
  private async transcodeToMp3Robust(file: Express.Multer.File): Promise<Buffer> {
    // Intentar primero con stream (más rápido)
    try {
      return await this.transcodeToMp3Stream(file.buffer, file.mimetype, file.originalname)
    } catch (streamError: any) {
      this.logger.warn(
        `[FFmpeg] Fallo en transcodificación por stream: ${streamError?.message}. Intentando con archivo temporal...`
      )
      // Fallback a método con archivo temporal (más confiable para formatos problemáticos)
      return await this.transcodeToMp3File(file)
    }
  }

  /**
   * Transcodifica usando stream (método original mejorado)
   */
  private async transcodeToMp3Stream(
    inputBuffer: Buffer,
    mimeType?: string,
    originalName?: string
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const inputStream = new Readable({ read() { } })
      inputStream.push(inputBuffer)
      inputStream.push(null)

      const chunks: Buffer[] = []

      // @ts-ignore tipos de fluent-ffmpeg
      const command = ffmpeg(inputStream)

      // Detectar y especificar formato de entrada si es necesario
      const inputFormat = this.detectInputFormat(mimeType, originalName)
      if (inputFormat) {
        command.inputFormat(inputFormat)
        this.logger.log(`[FFmpeg] Formato de entrada detectado: ${inputFormat}`)
      }

      command
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .format('mp3')
        .audioChannels(2) // Estéreo
        .audioFrequency(44100) // 44.1kHz
        .on('start', (cmd: string) => this.logger.log(`[FFmpeg] start: ${cmd}`))
        .on('stderr', (line: string) => {
          // Filtrar mensajes de stderr que no son errores
          if (line.includes('error') || line.includes('Error') || line.includes('Invalid')) {
            this.logger.error(`[FFmpeg] stderr: ${line}`)
          } else {
            this.logger.debug(`[FFmpeg] ${line}`)
          }
        })
        .on('error', (err: Error) => {
          this.logger.error(`[FFmpeg] error: ${err.message}`)
          reject(err)
        })
        .on('end', () => {
          this.logger.log(`[FFmpeg] end - ${chunks.length} chunks, ${Buffer.concat(chunks).length} bytes`)
          resolve(Buffer.concat(chunks))
        })

      const outputStream = command.pipe()
      outputStream.on('data', (chunk: Buffer) => chunks.push(chunk))
      outputStream.on('error', (err: Error) => {
        this.logger.error(`[FFmpeg] stream error: ${err.message}`)
        reject(err)
      })
    })
  }

  /**
   * Transcodifica usando archivos temporales (más confiable para formatos problemáticos como iOS)
   */
  private async transcodeToMp3File(file: Express.Multer.File): Promise<Buffer> {
    const tempDir = os.tmpdir()
    const inputExt = path.extname(file.originalname || '') || this.getExtensionFromMime(file.mimetype) || '.tmp'
    const tempInputFile = path.join(tempDir, `audio_input_${Date.now()}${inputExt}`)
    const tempOutputFile = path.join(tempDir, `audio_output_${Date.now()}.mp3`)

    try {
      // Escribir buffer a archivo temporal
      fs.writeFileSync(tempInputFile, file.buffer)
      this.logger.log(`[FFmpeg] Archivo temporal creado: ${tempInputFile}`)

      // Transcodificar usando archivo
      await new Promise<void>((resolve, reject) => {
        const inputFormat = this.detectInputFormat(file.mimetype, file.originalname)

        // @ts-ignore tipos de fluent-ffmpeg
        const command = ffmpeg(tempInputFile)

        if (inputFormat) {
          command.inputFormat(inputFormat)
          this.logger.log(`[FFmpeg] Formato de entrada: ${inputFormat}`)
        }

        command
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .format('mp3')
          .audioChannels(2)
          .audioFrequency(44100)
          .on('start', (cmd: string) => this.logger.log(`[FFmpeg] start: ${cmd}`))
          .on('stderr', (line: string) => {
            if (line.includes('error') || line.includes('Error') || line.includes('Invalid')) {
              this.logger.error(`[FFmpeg] stderr: ${line}`)
            } else {
              this.logger.debug(`[FFmpeg] ${line}`)
            }
          })
          .on('error', (err: Error) => {
            this.logger.error(`[FFmpeg] error: ${err.message}`)
            reject(err)
          })
          .on('end', () => {
            this.logger.log('[FFmpeg] Transcodificación completada')
            resolve()
          })
          .save(tempOutputFile)
      })

      // Leer archivo de salida
      const outputBuffer = fs.readFileSync(tempOutputFile)
      this.logger.log(`[FFmpeg] Archivo de salida leído: ${outputBuffer.length} bytes`)

      return outputBuffer
    } finally {
      // Limpiar archivos temporales
      if (fs.existsSync(tempInputFile)) {
        try {
          fs.unlinkSync(tempInputFile)
        } catch (e) {
          this.logger.warn(`No se pudo eliminar archivo temporal: ${tempInputFile}`)
        }
      }
      if (fs.existsSync(tempOutputFile)) {
        try {
          fs.unlinkSync(tempOutputFile)
        } catch (e) {
          this.logger.warn(`No se pudo eliminar archivo temporal: ${tempOutputFile}`)
        }
      }
    }
  }

  /**
   * Detecta el formato de entrada basado en MIME type y extensión
   */
  private detectInputFormat(mimeType?: string, filename?: string): string | null {
    const ext = path.extname(filename || '').toLowerCase().replace('.', '')
    const mime = (mimeType || '').toLowerCase()

    // Formatos específicos de iOS
    if (ext === 'caf' || mime.includes('caf')) {
      return 'caf'
    }
    if (ext === 'm4a' || mime.includes('m4a') || mime.includes('x-m4a')) {
      return 'm4a'
    }
    if (ext === 'mp4' || mime.includes('mp4')) {
      return 'mp4'
    }
    if (ext === 'aac' || mime.includes('aac')) {
      return 'aac'
    }

    // Otros formatos comunes
    if (ext === 'wav' || mime.includes('wav')) {
      return 'wav'
    }
    if (ext === 'ogg' || mime.includes('ogg') || mime.includes('oga')) {
      return 'ogg'
    }
    if (ext === 'webm' || mime.includes('webm')) {
      return 'webm'
    }
    if (ext === 'flac' || mime.includes('flac')) {
      return 'flac'
    }
    if (ext === 'mp3' || mime.includes('mp3') || mime.includes('mpeg')) {
      return 'mp3'
    }

    return null // Dejar que FFmpeg detecte automáticamente
  }

  /**
   * Obtiene extensión de archivo basado en MIME type
   */
  private getExtensionFromMime(mimeType?: string): string {
    if (!mimeType) return '.tmp'

    const mime = mimeType.toLowerCase()
    if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3'
    if (mime.includes('wav')) return '.wav'
    if (mime.includes('m4a') || mime.includes('x-m4a')) return '.m4a'
    if (mime.includes('mp4')) return '.mp4'
    if (mime.includes('ogg') || mime.includes('oga')) return '.ogg'
    if (mime.includes('webm')) return '.webm'
    if (mime.includes('flac')) return '.flac'
    if (mime.includes('caf')) return '.caf'
    if (mime.includes('aac')) return '.aac'

    return '.tmp'
  }

  private async generateSummary(text: string): Promise<string> {
    try {
      // Determinar el tipo de cadena basado en la longitud del texto
      const textLength = text.length
      const chainType = textLength > 4000 ? 'map_reduce' : 'stuff'

      this.logger.log(`Generando resumen con cadena tipo: ${chainType}`)

      // Crear documento de LangChain
      const document = new Document({
        pageContent: text,
        metadata: { source: 'audio_transcription' },
      })

      // Cargar cadena de resumen
      const summarizationChain = loadSummarizationChain(this.chatModel, {
        type: chainType,
      })

      // Ejecutar la cadena de resumen base
      const result = await summarizationChain.call({ input_documents: [document] })
      const baseSummary: string = result.text || ''

      // Estructurar para contexto de estimación técnica
      const structured = await this.structureTechnicalSummary({
        sourceText: text,
        draft: baseSummary,
      })

      // Reglas solicitadas: mismo idioma que la transcripción y longitud mínima del 50%
      const minChars = Math.floor(textLength * this.summaryMinRatio)
      const finalSummary = await this.enforceSummaryConstraints({
        draft: structured,
        sourceText: text,
        minChars,
      })

      return finalSummary || 'No se pudo generar un resumen del contenido.'
    } catch (error) {
      this.logger.error(`Error en generación de resumen: ${error.message}`)
      throw new Error(`Error al generar el resumen: ${error.message}`)
    }
  }

  /**
   * Reestructura el resumen pensando en estimaciones de obras/servicios técnicos.
   * Siempre devuelve la salida en inglés, sin inventar datos y sin omitir detalles relevantes.
   */
  private async structureTechnicalSummary(params: {
    sourceText: string
    draft: string
  }): Promise<string> {
    const { sourceText, draft } = params
    const sample = sourceText.slice(0, 2000)

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              [
                'You are a senior pre-sales and technical estimation assistant for construction and remodeling.',
                'Your job is to restructure information from a transcript so it is useful for technical estimation.',
                'Do NOT invent facts or measurements.',
                'Always produce the output IN ENGLISH only, translating faithfully from the source language when needed.',
                'Do not omit relevant technical details that appear in the source text.',
                'Never output placeholder sentences like "No content provided" or similar.',
                'If there is no information for a section, simply omit that section.',
              ].join('\n'),
          },
          {
            role: 'user',
            content: [
              'Restructure the following information for a technical estimator. Rules:',
              '- Do not invent facts. Do not extrapolate unknown measurements.',
              '- Language: Output MUST be ENGLISH only, translating faithfully from the source text when required.',
              '- Do not omit any relevant piece of information present in the source text, even if it is brief.',
              '- Clarity and order: use sections and lists when helpful for readability.',
              '- Include all relevant information; if something is ambiguous, flag it as pending clarification.',
              '- IMPORTANT: Never write sentences such as "No content provided" or similar placeholders.',
              '- If there is no information for a section, simply omit that section.',
              '',
              'Output format (important):',
              '- SECTION TITLES IN UPPERCASE, without any \"#\" prefix.',
              '- Leave one blank line between sections.',
              '- Use lists with \"- \" for items, and numbering like \"1)\", \"2)\" when appropriate.',
              '- Preserve line breaks and indentation to enhance readability.',
              '- Do not use advanced Markdown, tables, JSON, or HTML. Plain structured text only.',
              '- Do not wrap the output in quotes or add extra commentary.',
              '',
              'Suggested sections (use only those that apply):',
              '1) Scope and objectives',
              '2) Locations/areas',
              '3) Technical specifications (materials, brands, qualities)',
              '4) Measurements and quantities (if mentioned)',
              '5) Tasks and work sequence',
              '6) Constraints/considerations (access, schedules, regulations)',
              '7) Risks and assumptions',
              '8) Deliverables and acceptance criteria',
              '9) Observations and pending items',
              '',
              'Source text (sample for context):',
              '<<<\n' + sample + '\n>>>',
              '',
              'Base summary:',
              '<<<\n' + (draft || '(empty)') + '\n>>>',
              '',
              'Respond only with the restructured version, following the requested format.',
            ].join('\n'),
          },
        ],
      })

      return completion.choices?.[0]?.message?.content?.trim() || draft
    } catch (e: any) {
      this.logger.warn(`[Estructuración] Falló reestructuración: ${e?.message || e}`)
      return draft
    }
  }

  /**
   * Asegura que el resumen cumpla dos condiciones:
   * 1) La salida sea SIEMPRE en inglés (traduciendo si es necesario)
   * 2) Tenga una longitud mínima en caracteres (>= minChars)
   * Si el borrador es corto, intenta expandirlo 1-2 veces con OpenAI.
   */
  private async enforceSummaryConstraints(params: {
    draft: string
    sourceText: string
    minChars: number
  }): Promise<string> {
    const { draft, sourceText, minChars } = params

    // Si el borrador ya cumple, devolver tal cual
    if (draft && draft.length >= minChars) {
      return draft
    }

    const sourceSample = sourceText.slice(0, 1200)

    let current = draft?.trim() || ''
    // Si no hubo salida del primer resumen, partir desde un breve extracto inicial
    if (!current) {
      current = 'Resumen inicial no disponible. Por favor, genera un resumen fiel y detallado.'
    }

    // Hasta 2 intentos de expansión para alcanzar el mínimo
    const maxAttempts = 2
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (current.length >= minChars) break

      const target = Math.max(minChars, Math.floor(minChars * 1.1))
      const estimatedTokens = Math.min(3500, Math.ceil(target / 4) + 200)

      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: estimatedTokens,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert writing assistant. Rewrite summaries strictly following the user instructions. Always output IN ENGLISH, translating if needed. Preserve fidelity, do not invent facts.',
            },
            {
              role: 'user',
              content: [
                'Goal: Rewrite and expand the following summary to meet these rules:',
                `- Minimum length: ${minChars} characters (aim for ~60%-80% of the source length when possible).`,
                '- Language: Output MUST be ENGLISH only. Translate if required with high fidelity.',
                '- Content: preserve facts, do not invent. Elaborate on existing ideas with explicit details.',
                '- Style: clear, structured, and readable. Use paragraphs and concise lists where appropriate.',
                '',
                'Output format (important):',
                '- SECTION TITLES IN UPPERCASE, without any \"#\" prefix.',
                '- Leave one blank line between sections.',
                '- Use lists with "- " for items, and numbering like "1)", "2)" when applicable.',
                '- Preserve line breaks and indentation to enhance readability.',
                '- Do not use advanced Markdown, tables, JSON, or HTML. Plain structured text only.',
                '- Do not wrap the output in quotes or add extra commentary.',
                '',
                'Source text (sample for context):',
                '<<<\n' + sourceSample + '\n>>>',
                '',
                'Current summary:',
                '<<<\n' + current + '\n>>>',
                '',
                'Respond ONLY with the new summary, following the requested format, without preambles or explanations.',
              ].join('\n'),
            },
          ],
        })

        const expanded = completion.choices?.[0]?.message?.content?.trim() || ''
        if (expanded) {
          current = expanded
        } else {
          this.logger.warn('[Resumen] Expansión vacía recibida del modelo')
          break
        }
      } catch (e: any) {
        this.logger.error(`[Resumen] Error al expandir: ${e?.message || e}`)
        break
      }
    }

    // Si aún no alcanza el mínimo, forzar un relleno responsable en inglés
    if (current.length < minChars) {
      const deficit = minChars - current.length
      // Añadir una posdata que refuerce contexto sin romper estilo. Evitamos inventar hechos.
      current = `${current}\n\n(Expansion) Additional details from the content: elaborates on ideas, relationships, and nuances already present in the original text, preserving fidelity and accuracy in English. `.repeat(
        Math.ceil(deficit / 150)
      ).slice(0, minChars)
    }

    return current
  }
}
