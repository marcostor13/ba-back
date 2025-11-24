# Reglas y Buenas Prácticas del Proyecto BA Backend

Este documento establece las reglas, convenciones y buenas prácticas que deben seguirse en el desarrollo del proyecto BA Backend. **Este documento debe ser consultado en cada prompt o tarea de desarrollo para mantener la consistencia del código.**

---

## 📋 Tabla de Contenidos

1. [Arquitectura y Estructura](#arquitectura-y-estructura)
2. [Principios SOLID](#principios-solid)
3. [Convenciones de Código](#convenciones-de-código)
4. [Módulos y Organización](#módulos-y-organización)
5. [DTOs y Validación](#dtos-y-validación)
6. [Mongoose y MongoDB](#mongoose-y-mongodb)
7. [Servicios](#servicios)
8. [Controladores](#controladores)
9. [Manejo de Errores](#manejo-de-errores)
10. [Seguridad y Autenticación](#seguridad-y-autenticación)
11. [TypeScript](#typescript)
12. [Testing](#testing)
13. [Comentarios y Documentación](#comentarios-y-documentación)

---

## Arquitectura y Estructura

### Estructura de Carpetas

El proyecto sigue una arquitectura modular de NestJS:

```
src/
├── modules/           # Módulos de funcionalidad
│   ├── auth/         # Autenticación
│   ├── users/        # Usuarios
│   ├── role/         # Roles
│   ├── customer/     # Clientes
│   ├── quote/        # Cotizaciones
│   ├── audio/        # Procesamiento de audio
│   └── upload/       # Subida de archivos
├── app.module.ts     # Módulo raíz
├── app.controller.ts # Controlador raíz
├── app.service.ts    # Servicio raíz
└── main.ts          # Punto de entrada
```

### Estructura de un Módulo

Cada módulo debe seguir esta estructura:

```
module-name/
├── dto/                    # Data Transfer Objects
│   ├── create-module.dto.ts
│   └── update-module.dto.ts
├── entities/               # Entidades (para TypeORM) o schemas/ (para Mongoose)
│   └── module.entity.ts
├── schemas/                # Schemas de Mongoose (si aplica)
│   └── module.schema.ts
├── module.controller.ts    # Controlador
├── module.service.ts       # Servicio
├── module.module.ts        # Módulo
├── module.controller.spec.ts # Tests del controlador
└── module.service.spec.ts  # Tests del servicio
```

### Reglas de Estructura

- ✅ **Cada módulo debe ser independiente y autocontenido**
- ✅ **Los DTOs deben estar en la carpeta `dto/` dentro del módulo**
- ✅ **Las entidades/schemas deben estar en `entities/` o `schemas/` según corresponda**
- ✅ **Los tests deben estar junto a los archivos que prueban (`.spec.ts`)**
- ✅ **Usar nombres descriptivos y en camelCase para archivos**

---

## Principios SOLID

### Single Responsibility Principle (SRP)

- ✅ **Cada clase debe tener una única responsabilidad**
- ✅ **Los servicios deben manejar solo la lógica de negocio de su dominio**
- ✅ **Los controladores solo deben manejar HTTP (request/response)**
- ✅ **Los DTOs solo deben definir la estructura de datos**

**Ejemplo Correcto:**

```typescript
@Injectable()
export class QuoteService {
  // Solo maneja lógica de negocio de cotizaciones
  async createKitchenQuote(dto: CreateKitchenQuoteRequestDto): Promise<Quote> {
    // Lógica de creación
  }
}
```

**Ejemplo Incorrecto:**

```typescript
@Injectable()
export class QuoteService {
  // ❌ No debe manejar autenticación
  async validateUser() {}
  // ❌ No debe manejar envío de emails
  async sendEmail() {}
}
```

### Open/Closed Principle (OCP)

- ✅ **Las clases deben estar abiertas para extensión, cerradas para modificación**
- ✅ **Usar interfaces y abstracciones cuando sea posible**
- ✅ **Evitar modificar código existente, extender funcionalidad**

### Liskov Substitution Principle (LSP)

- ✅ **Las clases derivadas deben poder sustituir a sus clases base**
- ✅ **Mantener contratos de interfaces consistentes**

### Interface Segregation Principle (ISP)

- ✅ **Crear interfaces específicas en lugar de interfaces generales**
- ✅ **Los clientes no deben depender de métodos que no usan**

### Dependency Inversion Principle (DIP)

- ✅ **Depender de abstracciones, no de implementaciones concretas**
- ✅ **Usar inyección de dependencias de NestJS**
- ✅ **Inyectar servicios en constructores, no crear instancias directamente**

**Ejemplo Correcto:**

```typescript
@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    private readonly customerService: CustomerService // ✅ Inyección
  ) {}
}
```

**Ejemplo Incorrecto:**

```typescript
@Injectable()
export class QuoteService {
  constructor() {
    this.customerService = new CustomerService() // ❌ No crear instancias
  }
}
```

---

## Convenciones de Código

### Nomenclatura

#### Archivos y Carpetas

- ✅ **Archivos TypeScript**: `camelCase.ts` (ej: `quote.service.ts`)
- ✅ **DTOs**: `kebab-case.dto.ts` (ej: `create-customer.dto.ts`)
- ✅ **Entidades/Schemas**: `camelCase.entity.ts` o `camelCase.schema.ts`
- ✅ **Carpetas de módulos**: `camelCase` (ej: `customer/`, `quote/`)

#### Clases

- ✅ **Clases**: `PascalCase` (ej: `QuoteService`, `CreateCustomerDto`)
- ✅ **Interfaces**: `PascalCase` con prefijo `I` opcional (ej: `IUser`, `QuoteDocument`)
- ✅ **Enums**: `PascalCase` (ej: `UserRole`, `QuoteStatus`)

#### Variables y Funciones

- ✅ **Variables y funciones**: `camelCase` (ej: `createQuote`, `userId`)
- ✅ **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_FILE_SIZE`, `JWT_SECRET`)
- ✅ **Privadas**: Prefijo `private` o `readonly` cuando corresponda

#### Base de Datos

- ✅ **Colecciones MongoDB**: `camelCase` plural (ej: `quotes`, `customers`)
- ✅ **Campos de documentos**: `camelCase` (ej: `userId`, `totalPrice`)
- ✅ **ObjectIds**: Usar `MongooseSchema.Types.ObjectId` en schemas

### Espaciado y Formato

- ✅ **Usar 2 espacios para indentación** (no tabs)
- ✅ **Líneas máximas**: 120 caracteres (cuando sea posible)
- ✅ **Espacio después de comas**: `function(a, b, c)`
- ✅ **Espacio alrededor de operadores**: `a === b`
- ✅ **Línea en blanco entre métodos**
- ✅ **Línea en blanco entre imports y código**

### Imports

- ✅ **Ordenar imports**: NestJS → Librerías externas → Módulos locales → Tipos
- ✅ **Usar imports absolutos cuando sea posible** (gracias a `baseUrl` en tsconfig)
- ✅ **Agrupar imports relacionados**

**Ejemplo Correcto:**

```typescript
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { Quote } from './schemas/quote.schema'
```

---

## Módulos y Organización

### Creación de Módulos

- ✅ **Cada módulo debe tener su propio `*.module.ts`**
- ✅ **Registrar schemas de Mongoose en el módulo**
- ✅ **Exportar servicios que serán usados por otros módulos**
- ✅ **Importar módulos necesarios en `imports`**

**Ejemplo:**

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService], // ✅ Exportar si otros módulos lo necesitan
})
export class QuoteModule {}
```

### Módulo Raíz

- ✅ **`AppModule` debe importar todos los módulos de funcionalidad**
- ✅ **Configuración global (ConfigModule, MongooseModule) en AppModule**
- ✅ **Mantener AppModule limpio y organizado**

---

## DTOs y Validación

### Creación de DTOs

- ✅ **Usar `class-validator` para validación**
- ✅ **Usar `class-transformer` para transformación de datos**
- ✅ **Crear DTOs separados para Create y Update**
- ✅ **Usar `PartialType` de `@nestjs/mapped-types` para UpdateDTOs**

**Ejemplo:**

```typescript
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @MinLength(6)
  password: string
}

// Update DTO usando PartialType
import { PartialType } from '@nestjs/mapped-types'
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
```

### Transformaciones

- ✅ **Usar `@Transform()` para normalizar datos de entrada**
- ✅ **Crear funciones helper reutilizables para transformaciones comunes**
- ✅ **Validar y transformar antes de procesar**

**Ejemplo:**

```typescript
const toStringOrUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  return String(value).trim()
}

export class CreateCustomerDto {
  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  name?: string
}
```

### Validación en Controladores

- ✅ **Usar `ValidationPipe` en controladores**
- ✅ **Configurar `whitelist: true` y `forbidNonWhitelisted: true`**
- ✅ **Habilitar `transform: true` para conversión automática**

**Ejemplo:**

```typescript
const validationPipe = new ValidationPipe({
  transform: true,
  whitelist: true
});

@Post()
async create(@Body(validationPipe) body: CreateCustomerDto) {
  return this.customerService.create(body);
}
```

---

## Mongoose y MongoDB

### Schemas

- ✅ **Usar decoradores `@Schema()` y `@Prop()` de `@nestjs/mongoose`**
- ✅ **Definir tipos explícitos para propiedades**
- ✅ **Usar `MongooseSchema.Types.ObjectId` para referencias**
- ✅ **Agregar `timestamps: true` cuando se necesite**
- ✅ **Crear índices cuando sea necesario para performance**

**Ejemplo:**

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'

@Schema({ timestamps: true })
export class Quote {
  @Prop({ type: Object, required: true })
  customer: Record<string, unknown>

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: MongooseSchema.Types.ObjectId

  @Prop({ type: String, default: 'kitchen' })
  category: string
}

export const QuoteSchema = SchemaFactory.createForClass(Quote)
QuoteSchema.index({ category: 1, createdAt: -1 }) // ✅ Índice compuesto
```

### Consultas Eficientes

- ✅ **Usar `.lean()` cuando no se necesiten métodos de Mongoose**
- ✅ **Usar `.exec()` para obtener Promesas**
- ✅ **Limitar resultados con `.limit()` y `.skip()` cuando sea necesario**
- ✅ **Usar `.select()` para obtener solo campos necesarios**
- ✅ **Usar `.sort()` para ordenar resultados**

**Ejemplo:**

```typescript
async findAll(category?: string): Promise<Quote[]> {
  const filter: Record<string, unknown> = {};
  if (category) {
    filter.category = category;
  }
  return this.quoteModel
    .find(filter)
    .sort({ createdAt: -1 })
    .lean()
    .exec() as Promise<Quote[]>;
}
```

### Tipos de Retorno

- ✅ **Usar tipos explícitos en métodos de servicios**
- ✅ **Usar `as Promise<T>` cuando TypeScript tenga problemas de inferencia**
- ✅ **Retornar objetos planos con `.toObject()` o `.lean()`**

**Ejemplo:**

```typescript
async createKitchenQuote(dto: CreateKitchenQuoteRequestDto): Promise<Quote> {
  const created = await this.quoteModel.create({ /* ... */ });
  return created.toObject(); // ✅ Retornar objeto plano
}
```

---

## Servicios

### Estructura de Servicios

- ✅ **Decorar con `@Injectable()`**
- ✅ **Inyectar dependencias en el constructor**
- ✅ **Métodos async deben retornar `Promise<T>`**
- ✅ **Usar tipos explícitos para parámetros y retornos**
- ✅ **Mantener métodos pequeños y enfocados**

**Ejemplo:**

```typescript
@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>
  ) {}

  async createKitchenQuote(dto: CreateKitchenQuoteRequestDto): Promise<Quote> {
    // Implementación
  }

  async findAll(category?: string): Promise<Quote[]> {
    // Implementación
  }
}
```

### Lógica de Negocio

- ✅ **Toda la lógica de negocio debe estar en servicios**
- ✅ **Los servicios no deben conocer detalles de HTTP**
- ✅ **Validar datos antes de operaciones de base de datos**
- ✅ **Manejar errores apropiadamente**

---

## Controladores

### Estructura de Controladores

- ✅ **Decorar con `@Controller('route')`**
- ✅ **Métodos async deben tener tipos de retorno explícitos**
- ✅ **Usar decoradores apropiados (`@Get()`, `@Post()`, `@Patch()`, `@Delete()`)**
- ✅ **Validar body con `ValidationPipe`**
- ✅ **Mantener controladores delgados (thin controllers)**

**Ejemplo:**

```typescript
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('kitchen')
  async createQuote(
    @Body(validationPipe) body: CreateKitchenQuoteRequestDto
  ): Promise<Quote> {
    return this.quoteService.createKitchenQuote(body)
  }

  @Get()
  async findAll(@Query('category') category?: string): Promise<Quote[]> {
    return this.quoteService.findAll(category)
  }
}
```

### Parámetros de Ruta y Query

- ✅ **Usar `@Param('id')` para parámetros de ruta**
- ✅ **Usar `@Query('param')` para query parameters**
- ✅ **Usar `@Body()` para request body**
- ✅ **Validar parámetros cuando sea necesario**

---

## Manejo de Errores

### Excepciones de NestJS

- ✅ **Usar excepciones HTTP de NestJS** (`BadRequestException`, `UnauthorizedException`, `NotFoundException`, etc.)
- ✅ **Proporcionar mensajes de error descriptivos**
- ✅ **No exponer detalles internos del sistema en errores**

**Ejemplo:**

```typescript
async register(registerDto: RegisterDto): Promise<any> {
  const userExists = await this.usersService.findOne(email);
  if (userExists) {
    throw new BadRequestException('The user already exists'); // ✅
  }
  // ...
}
```

### Validación de Datos

- ✅ **Validar datos antes de procesarlos**
- ✅ **Usar DTOs con validadores para validación automática**
- ✅ **Validar ObjectIds antes de consultas**

**Ejemplo:**

```typescript
async findById(id: string): Promise<Quote | null> {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('Invalid ID format');
  }
  return this.quoteModel.findById(id).lean().exec();
}
```

---

## Seguridad y Autenticación

### Autenticación JWT

- ✅ **Usar Passport con estrategia JWT**
- ✅ **Proteger rutas con `@UseGuards(AuthGuard('jwt'))`**
- ✅ **Hashear contraseñas con bcrypt (salt rounds: 10)**
- ✅ **Nunca retornar contraseñas en respuestas**

**Ejemplo:**

```typescript
// Hashear contraseña
const hashedPassword = await bcrypt.hash(password, 10)

// Comparar contraseña
const isValid = await bcrypt.compare(password, hashedPassword)

// Excluir contraseña del resultado
const { password, ...result } = user
return result
```

### Validación de Input

- ✅ **Validar y sanitizar todos los inputs**
- ✅ **Usar `whitelist: true` en ValidationPipe**
- ✅ **Validar ObjectIds de MongoDB**
- ✅ **Validar tipos de archivo y tamaños**

---

## TypeScript

### Configuración

- ✅ **Usar `strictNullChecks: true`**
- ✅ **Evitar `any` cuando sea posible**
- ✅ **Usar tipos explícitos en funciones públicas**
- ✅ **Usar interfaces para definir contratos**

### Tipos

- ✅ **Definir interfaces para objetos complejos**
- ✅ **Usar tipos de unión cuando sea apropiado** (`string | null`)
- ✅ **Usar tipos genéricos cuando sea necesario**
- ✅ **Exportar tipos e interfaces cuando se reutilicen**

**Ejemplo:**

```typescript
export interface IUser {
  _id?: Types.ObjectId
  email: string
  name: string
  password?: string
}

export type QuoteDocument = Quote & Document
```

### Inferencia de Tipos

- ✅ **Cuando TypeScript tenga problemas de inferencia, usar tipos explícitos**
- ✅ **Usar `as Promise<T>` cuando sea necesario para evitar errores de compilación**
- ✅ **Agregar comentarios `@ts-ignore` solo cuando sea absolutamente necesario y documentar por qué**

---

## Testing

### Estructura de Tests

- ✅ **Crear archivos `.spec.ts` junto a los archivos que prueban**
- ✅ **Usar Jest como framework de testing**
- ✅ **Probar servicios y controladores por separado**
- ✅ **Usar mocks para dependencias**

**Ejemplo:**

```typescript
describe('QuoteService', () => {
  let service: QuoteService
  let model: Model<Quote>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        {
          provide: getModelToken(Quote.name),
          useValue: mockModel,
        },
      ],
    }).compile()

    service = module.get<QuoteService>(QuoteService)
    model = module.get<Model<Quote>>(getModelToken(Quote.name))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
```

---

## Comentarios y Documentación

### Comentarios en Código

- ✅ **Comentar código complejo o no obvio**
- ✅ **Usar comentarios en español** (según preferencia del proyecto)
- ✅ **Evitar comentarios obvios que repiten el código**
- ✅ **Documentar funciones públicas complejas**

**Ejemplo:**

```typescript
// Método para registrar un nuevo usuario
// Crea el usuario, asigna role "customer" y retorna JWT
async register(registerDto: RegisterDto): Promise<any> {
  // ...
}
```

### Documentación de API

- ✅ **Mantener documentación de API actualizada en `/docs`**
- ✅ **Documentar endpoints, payloads y respuestas**
- ✅ **Incluir ejemplos de uso**

---

## Reglas Específicas del Proyecto

### Sistema de Compañías

- ✅ **Todas las cotizaciones deben estar asociadas a una compañía**
- ✅ **Filtrar datos por compañía cuando sea necesario**
- ✅ **Mantener independencia de datos entre compañías**

### Sistema de Versiones

- ✅ **Cada edición de estimación debe crear una nueva versión**
- ✅ **Mantener historial completo de versiones**
- ✅ **Asociar versiones a la misma compañía de la cotización original**

### Roles y Usuarios

- ✅ **Crear role "customer" automáticamente al registrar usuario**
- ✅ **Asociar roles con `userId` como ObjectId**
- ✅ **Validar existencia de roles antes de operaciones**

### Archivos y Uploads

- ✅ **Validar tipos de archivo permitidos**
- ✅ **Limitar tamaños de archivo (10MB general, 25MB audio)**
- ✅ **Usar nombres únicos para archivos subidos**
- ✅ **Eliminar archivos cuando sea necesario**

---

## Checklist de Desarrollo

Antes de hacer commit, verificar:

- ✅ **Código sigue las convenciones de nomenclatura**
- ✅ **DTOs tienen validación apropiada**
- ✅ **Servicios tienen tipos explícitos de retorno**
- ✅ **Controladores usan ValidationPipe**
- ✅ **Consultas MongoDB son eficientes (usar `.lean()` cuando corresponda)**
- ✅ **Errores se manejan apropiadamente**
- ✅ **No hay uso de `any` innecesario**
- ✅ **Imports están organizados**
- ✅ **Código está formateado (Prettier)**
- ✅ **No hay errores de linting**
- ✅ **Tests pasan (si aplica)**

---

## Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Build
npm run build

# Linting
npm run lint

# Formateo
npm run format

# Tests
npm run test
npm run test:watch
npm run test:cov
```

---

## Referencias

- [Documentación de NestJS](https://docs.nestjs.com/)
- [Documentación de Mongoose](https://mongoosejs.com/docs/)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)

---

**Última actualización**: 12 de Noviembre de 2025

**Nota**: Este documento debe ser consultado en cada prompt o tarea de desarrollo para mantener la consistencia del código y seguir las mejores prácticas establecidas en el proyecto.
