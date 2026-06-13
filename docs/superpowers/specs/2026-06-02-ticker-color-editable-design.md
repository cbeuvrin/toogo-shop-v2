# Color de fondo y texto editable en la barra de noticias (ticker)

**Fecha:** 2026-06-02
**Estado:** Aprobado para implementación

## Objetivo

Permitir que el usuario cambie el **color de fondo** y el **color de texto** de la
barra de noticias (ticker) desde el editor visual, en todas las plantillas que la
renderizan. Hoy esos colores están fijos (hardcodeados) por plantilla.

## Decisiones tomadas

1. **Qué se edita:** color de fondo **y** color de texto (ambos). Editar solo el
   fondo dejaría el texto blanco fijo ilegible sobre fondos claros.
2. **Alcance:** todas las plantillas que renderizan el ticker.
3. **Cyber:** se aplica el override también. Si el usuario define color, gana sobre
   la paleta neon; si lo deja vacío, mantiene el neon por defecto.
4. **Opt-in:** si los campos quedan vacíos, cada plantilla conserva su look actual.
   No se cambia ningún default visual existente.

## Modelo de datos

Extender `TickerData` con dos campos opcionales:

```ts
interface TickerData {
  text: string;
  enabled: boolean;
  fontSize?: number;
  animated?: boolean;
  bgColor?: string;    // nuevo — vacío = fondo por defecto de la plantilla
  textColor?: string;  // nuevo — vacío = color de texto por defecto
}
```

**Persistencia:** no requiere cambios. El ticker se guarda como blob JSON completo
(`handleSaveTicker` → `saveEditorData('ticker','ticker_bar', tickerData)` en
`DashboardVisualEditor`, y `useToogoStore` lee `tickerData.data` entero). Los campos
nuevos fluyen automáticamente.

Sí se actualizan las **interfaces TypeScript** en 3 lugares para consistencia:
- `TickerEditModal.tsx` (`interface TickerData`)
- `StorePreview.tsx` (~línea 57, tipo `ticker?`)
- `DashboardVisualEditor.tsx` (~línea 95, tipo `ticker?`)

## Editor (UI)

En `TickerEditModal.tsx`, agregar dos selectores de color siguiendo el patrón exacto
ya usado en `TextStyleEditModal.tsx`:
- `<input type="color">` + campo de texto hex + botón "Quitar" cuando hay valor.
- Etiquetas: **"Color de fondo"** y **"Color de texto"**.
- Nota bajo cada uno: *"Vacío = usar el color por defecto de la plantilla."*
- Estado: `bgColor` y `textColor` inicializados desde `initialData` (vacío por defecto).

## Render — override condicional

Regla uniforme: si `ticker.bgColor` / `ticker.textColor` existen, aplicarlos como
`style` inline (ganan sobre las clases Tailwind hardcodeadas); si no, mantener el
default actual de cada plantilla.

Patrón:
```tsx
<div
  className="... (clases actuales) ..."
  style={{
    ...(ticker?.bgColor ? { backgroundColor: ticker.bgColor } : {}),
    ...(ticker?.textColor ? { color: ticker.textColor } : {}),
    ...(ticker?.fontSize ? { fontSize: `${ticker.fontSize}px` } : {}),
  }}
>
```

En plantillas donde el color de texto está en los `<span>` internos (no heredado del
wrapper), aplicar `textColor` también ahí (o asegurar herencia desde el wrapper).

### Archivos a tocar

| Archivo | Default actual | Cambio |
|---|---|---|
| `FashionHeroTemplate.tsx` (Indico) | `bg-black text-white` (wrapper) | override inline en wrapper |
| `SimpleLiveTemplate.tsx` | `bg-black text-white` (wrapper) | override inline en wrapper |
| `TrendyFashionTemplate.tsx` | `bg-white` (wrapper) + `text-gray-500` (spans) | override en wrapper + spans |
| `FashionTemplate.tsx` | `bg-white` (wrapper) + texto negro | override en wrapper + texto |
| `CyberTemplate.tsx` | `cyberSurface` (wrapper) + `cyberNeon` (spans) | override gana sobre paleta cuando hay valor |
| `StorePreview.tsx` (3 bloques de preview) | `bg-black text-white` | override inline en los 3 |

**No requieren cambios:** `NatureTemplate.tsx` y `PremiumBrandTemplate.tsx`
destructuran `ticker` pero no lo renderizan.

## Nota sobre Cyber

`CyberTemplate` controla la visibilidad de la barra con `announcement.enabled` (no
`ticker.enabled`) y usa `announcement?.text || tickerText`. El override de color se
aplica sobre la barra existente sin cambiar esa lógica de visibilidad/texto.

## Verificación

- `tsc --noEmit` (typecheck) pasa.
- Con campos vacíos: cada plantilla se ve idéntica a hoy (sin regresión).
- Con color definido: fondo y texto cambian tanto en el preview del editor
  (`StorePreview`) como en la tienda en vivo (cada `*Template`).
- Probar contraste: fondo claro + texto oscuro queda legible.

## Fuera de alcance (YAGNI)

- Degradados / gradientes (el usuario eligió color sólido).
- Colores por plantilla independientes (un solo `ticker` compartido).
