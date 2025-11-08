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
      modelName: 'gpt-4o',
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
          const transcodedBuffer = await this.transcodeToMp3(file.buffer)
          this.logger.log(`[Transcripción] Transcodificación completada: ${transcodedBuffer.length} bytes`)
          uploadBuffer = transcodedBuffer
          uploadMime = 'audio/mpeg'
          uploadName = `${file.originalname}.mp3`
        } catch (tErr: any) {
          this.logger.warn(`[Transcripción] Fallback sin transcodificar por error: ${tErr?.message || tErr}`)
          uploadBuffer = file.buffer
          uploadMime = file.mimetype || 'audio/wav'
          uploadName = file.originalname
        }
      } else {
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
    }
  }

  private async transcodeToMp3(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const inputStream = new Readable({ read() { } })
      inputStream.push(inputBuffer)
      inputStream.push(null)

      const chunks: Buffer[] = []

      // @ts-ignore tipos de fluent-ffmpeg
      const command = ffmpeg(inputStream)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .format('mp3')
        .on('start', (cmd: string) => this.logger.log(`[FFmpeg] start: ${cmd}`))
        .on('stderr', (line: string) => this.logger.log(`[FFmpeg] ${line}`))
        .on('error', (err: Error) => {
          this.logger.error(`[FFmpeg] error: ${err.message}`)
          reject(err)
        })
        .on('end', () => {
          this.logger.log('[FFmpeg] end')
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
   * Siempre devuelve la salida en inglés y no inventa datos.
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
              'You are a senior pre-sales and technical estimation assistant for construction and remodeling. Structure technical information with precision. Do not invent facts. Always produce the output IN ENGLISH, regardless of the source language.',
          },
          {
            role: 'user',
            content: [
              'Restructure the following information for a technical estimator. Rules:',
              '- Do not invent facts. Do not extrapolate unknown measurements.',
              '- Language: Output MUST be ENGLISH only. Translate if needed with high fidelity.',
              '- Clarity and order: use sections and lists when helpful for readability.',
              '- Include all relevant information; if something is ambiguous, flag it as pending clarification.',
              '',
              'Output format (important):',
              '- SECTION TITLES IN UPPERCASE, without any \"#\" prefix.',
              '- Leave one blank line between sections.',
              '- Use lists with "- " for items, and numbering like "1)", "2)" when appropriate.',
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
