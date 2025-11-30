# Problemas de Títulos y Labels Duplicados

Este documento lista las categorías donde el título de la sección se repite con los labels de los campos.

## Resumen

Se encontraron **9 categorías** que no deben mostrar título de sección porque son redundantes.

## Categorías a Ocultar Título


### 1. subfloor (inputs.json)

- **Título de categoría**: "Subfloor"
- **Número de campos**: 3
- **Primer campo**: "Basement Finished"
- **Razón**: Categoría pequeña (3 campos) donde el primer campo "Basement Finished" es muy descriptivo y podría estar siendo usado como título.


### 2. demolition (inputs.json)

- **Título de categoría**: "Demolition"
- **Número de campos**: 4
- **Primer campo**: "Demolition"
- **Razón**: El título de categoría "Demolition" coincide exactamente con el label "Demolition"


### 3. framing (inputs.json)

- **Título de categoría**: "Framing"
- **Número de campos**: 2
- **Primer campo**: "Frame New Wall"
- **Razón**: Categoría pequeña (2 campos) donde el primer campo "Frame New Wall" es muy descriptivo y podría estar siendo usado como título.


### 4. shelving (inputs.json)

- **Título de categoría**: "Shelving"
- **Número de campos**: 3
- **Primer campo**: "Glass Shelves 12 Inch"
- **Razón**: Categoría pequeña (3 campos) donde el primer campo "Glass Shelves 12 Inch" es muy descriptivo y podría estar siendo usado como título.


### 5. counteropTemplateFee (inputs.json)

- **Título de categoría**: "Counterop Template Fee"
- **Número de campos**: 1
- **Primer campo**: "Countertop Template Fee"
- **Razón**: Categoría con un solo campo. El label "Countertop Template Fee" ya es descriptivo.


### 6. cutouts (inputs.json)

- **Título de categoría**: "Cutouts"
- **Número de campos**: 3
- **Primer campo**: "Sink And Faucet Cutout"
- **Razón**: Categoría pequeña (3 campos) donde el primer campo "Sink And Faucet Cutout" es muy descriptivo y podría estar siendo usado como título.


### 7. stoneBacksplashTemplateFee (inputs.json)

- **Título de categoría**: "Stone Backsplash Template Fee"
- **Número de campos**: 1
- **Primer campo**: "Stone Backsplash Template Fee"
- **Razón**: Categoría con un solo campo. El label "Stone Backsplash Template Fee" ya es descriptivo.


### 8. sewer (inputs_additional_work.json)

- **Título de categoría**: "Sewer"
- **Número de campos**: 2
- **Primer campo**: "Sump pump (concrete, electric, plumbing)"
- **Razón**: Categoría pequeña (2 campos) donde el primer campo "Sump pump (concrete, electric, plumbing)" es muy descriptivo y podría estar siendo usado como título.


### 9. additionalWorks (inputs_additional_work.json)

- **Título de categoría**: "Additional Works"
- **Número de campos**: 2
- **Primer campo**: "Gas pipes"
- **Razón**: Categoría pequeña (2 campos) donde el primer campo "Gas pipes" es muy descriptivo y podría estar siendo usado como título.


## Recomendación

El frontend debe verificar el archivo `category-title-config.json` para determinar si una categoría debe mostrar título o no. Si una categoría está en la lista, solo se debe mostrar el label del campo, no el título de la categoría.

## Implementación Sugerida

```typescript
// Ejemplo de uso en el frontend
import categoryConfig from './category-title-config.json';

function shouldShowCategoryTitle(category: string): boolean {
  return !categoryConfig.categoriesToHideTitle.some(
    item => item.category === category
  );
}
```

---

*Generado automáticamente el 2025-11-25T21:03:14.521Z*
