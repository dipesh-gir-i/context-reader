# Context Reader Design System

## Product character
Context Reader is a reading tool first and an AI tool second. The interface should feel editorial, quiet, and precise: generous reading space, clear hierarchy, restrained controls, and contextual information that appears exactly when it is useful.

## Principles

1. **Reader first.** Never let AI chrome overpower the document.
2. **Context over decoration.** Use typography, borders, and whitespace to explain relationships before adding ornament.
3. **One strong focal point.** On the reader, that is the document; after selection, it becomes the selected word and its explanation.
4. **Dense when useful, airy when reading.** Utility surfaces may be compact; prose surfaces should breathe.
5. **Motion has a job.** Animate only state transitions that help orientation or confirmation.
6. **No AI-dashboard tropes.** Avoid gradient blobs, glassy panels, excessive pill controls, oversized hero copy, and repetitive card grids.

## Tokens

### Surfaces
- app background: `#f2f0ea`
- primary surface: `#faf9f5`
- secondary surface: `#ece9e0`
- document surround: `#dcd9d0`
- ink: `#171914`
- muted text: `#72766b`
- faint text: `#9a9d94`
- line: `#d6d3c9`
- accent: `#7058e8`
- accent-soft: `#ece8ff`

### Shape
- standard radius: 16px
- compact radius: 9–10px
- card radius: 13–15px
- avoid rounding every nested element

### Typography
- UI: system sans stack
- reading vocabulary / word cards: Georgia or another editorial serif
- metadata: system monospace
- body line-height: ~1.5
- labels: uppercase, 10–11px, increased tracking

### Spacing
Use a compact 4px base rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48.

## Components

### Buttons
Prefer quiet outlined controls for secondary actions and a single high-contrast primary action. Icon-only controls require a title/aria-label and should be used only for genuinely familiar actions.

### Context card
The selected word is the visual anchor. The hierarchy is:
word → contextual meaning → simpler explanation → why it matters → source sentence → actions.

### Side panel
The panel is a companion surface, not a chat window. Avoid avatars, message bubbles, and long conversation chrome.

### Empty states
Use concise editorial copy and one clear next action. Do not use decorative illustrations unless they communicate a real concept.

## Motion
200–260ms for panel/card transitions. Use opacity + small translation rather than dramatic scale. Respect `prefers-reduced-motion`.

## Accessibility
Visible focus rings, keyboard reachable controls, semantic headings, sufficient contrast, and no interaction that depends only on color or hover.
