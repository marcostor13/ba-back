# Guía Rápida de Línea Gráfica y Colores

Este documento resume las reglas visuales y de estilo que deben seguirse para el desarrollo de la plataforma, basadas en los diseños proporcionados.

## 1. Paleta de Colores Oficial

Esta es la paleta de colores exacta que se debe implementar. Los roles se asignan según el análisis de los diseños.

| Rol del Color              | Hex       | Descripción y Uso                                                                                                                                                      |
| :------------------------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fondo Principal**        | `#EAD1BA` | [cite_start]El color dominante para todos los fondos de la aplicación[cite: 1, 2, 21, 22].                                                                             |
| **Texto/Oscuro Principal** | `#332F28` | [cite_start]Usar para texto principal, cabeceras [cite: 25, 26, 28] [cite_start]y como fondo para elementos oscuros (ej. Logo "BA Stones Surfaces" [cite: 7, 18, 33]). |
| **Acento Verde**           | `#3A7344` | Color de marca primario. [cite_start]Usado para el logo "BA Kitchen & Bath Design" [cite: 6, 17, 31, 37] y debe usarse para CTAs (Call to Action) principales.         |
| **Texto Secundario**       | `#535353` | [cite_start]Para texto de menor jerarquía o placeholders (ej. "Search Customer" [cite: 27]).                                                                           |
| **Gris Claro (UI)**        | `#BFBFBF` | [cite_start]Para fondos de elementos de UI como barras de búsqueda [cite: 27] o contenedores sutiles.                                                                  |
| **Acento Secundario**      | `#997A63` | Tono marrón/tierra. Usar para bordes, separadores o elementos de UI secundarios que necesiten un contraste suave.                                                      |

---

## 2. Directrices de la Línea Gráfica

### Layout y Estructura

- [cite_start]**Fondo General:** Toda la aplicación debe reposar sobre el color `Fondo Principal` (`#EAD1BA`)[cite: 1, 2, 21, 22].
- **Encabezado:** El encabezado es persistente y debe incluir:
  - [cite_start]El saludo al usuario (ej. "Welcome Baldemar!")[cite: 9, 14, 29, 41].
  - [cite_start]Un avatar circular del usuario[cite: 29].
- [cite_start]**Navegación (Breadcrumbs):** Se debe implementar un sistema de "migas de pan" para mostrar la jerarquía de la página actual (ej. "Choose the company / BA Kitchen & Bath Design / Customer")[cite: 24].

### Branding y Logotipos

- [cite_start]**Selección de Compañía:** La pantalla de selección [cite: 5, 16, 36] es un punto clave.
- **Logos Circulares:** Cada "compañía" se representa con un logo circular distintivo:
  - [cite_start]**Kitchen & Bath:** Logo verde (`#3A7344`)[cite: 6, 17, 31, 37].
  - [cite_start]**Stones Surfaces:** Logo oscuro (`#332F28`)[cite: 7, 18, 33, 38].
  - [cite_start]**Exteriors:** Logo claro/blanco[cite: 8, 19, 23, 39].

### Componentes de UI

- **Botones:**
  - [cite_start]**Acción Principal:** Los botones de creación (ej. "+ Create Customer" [cite: 28]) deben usar un color de acento (como el verde `#3A7344`) para destacar.
  - [cite_start]**Botones de Selección:** Los botones de "Choose the company" deben ser grandes, claros y mostrar los logos circulares[cite: 6, 7, 8].
- **Campos de Búsqueda:**
  - [cite_start]Deben tener un fondo sutil (blanco o `#BFBFBF`)[cite: 27].
  - [cite_start]Deben incluir un ícono de búsqueda[cite: 30].
  - [cite_start]El texto del placeholder debe usar el color `Texto Secundario` (`#535353`)[cite: 27].
- [cite_start]**Contenedores:** El saludo al usuario se presenta en un contenedor blanco con esquinas redondeadas, lo que sugiere el uso de "tarjetas" o "cajas" blancas para agrupar contenido sobre el fondo principal[cite: 9, 29, 41].

### Íconos:

- Utiliza https://heroicons.com/ para todos los íconos.
