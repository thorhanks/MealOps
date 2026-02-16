# MealOps — Design Specification

## Core Aesthetic: Terminal/Hacker UI

The application emulates a command-line, developer-tools aesthetic. Think web-based terminal for meal management, not a consumer web app.

**Principles:** Raw, technical, utilitarian, hacker-oriented, performance-first, function over form.

**Reference aesthetic:** Classic Unix terminals, Hacker News, old BBS systems, htop/vim/tmux interfaces, developer consoles.

---

## Typography

**Monospaced fonts everywhere** — no sans-serif UI fonts.

Font stack (in order of preference):
```css
font-family: 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Inconsolata', monospace;
```

All text uses monospaced fonts: headings, body, buttons, inputs, labels.

---

## Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Near-black | `#0a0a0a` |
| Primary text | Amber | `#ffb000` |
| Muted/inactive | Dimmed amber | `#aa7700` |
| Error | Red | `#ff3333` |
| Success/active | Bright green | `#00ff00` |
| Accent/highlight | Bright amber | `#ffcc00` |

Use color sparingly for emphasis, status, or hierarchy.

### CSS Custom Properties
```css
:root {
  --bg: #0a0a0a;
  --text: #ffb000;
  --text-muted: #aa7700;
  --error: #ff3333;
  --success: #00ff00;
  --accent: #ffcc00;
  --border: #ffb000;
  --border-muted: #aa7700;
}
```

---

## Layout & Spacing

- **No rounded corners**: `border-radius: 0` everywhere
- **No shadows or depth effects**: flat rendering only
- **Hard-edged rectangles**: simple boxes
- **Character-based spacing**: use `ch` units (e.g., `1ch`, `2ch`) for grid-aligned feel
- Precise, grid-aligned padding — no "soft" spacing

---

## UI Elements

### Buttons & Controls
- Reduced chrome — few visible buttons
- Text-based controls: `[action]`, `> action`, or highlighted text
- No gradients, no 3D effects
- Hover states: color change, underline, or bracket highlight

### Inputs
- Monospaced, flat inputs with bottom-border or full-border style
- Blinking cursor
- Terminal prompt prefix where appropriate: `> `

### Interactions
- Command-prompt metaphors (`>` for prompts, `[brackets]` for actions)
- Keyboard-first navigation throughout
- All actions accessible via keyboard

### Feedback & Messaging

**Success:**
```
OK: recipe saved [id:abc123]
OK: 3 servings logged
> recipe deleted
```

**Errors:**
```
ERROR: recipe not found [id:abc123]
ERROR: invalid macro values — protein must be >= 0
ERROR: failed to save — quota exceeded
```

- Inline display below relevant UI element or in status line
- No alert dialogs, no modal popups, no toast notifications
- Prefix errors with `ERROR:` in red
- Loading states: `[...]` or `loading...`

---

## Special UI Patterns

### Stacked Card Effect (Eat Section)

CSS box-shadows with no blur to create layered appearance:

```css
/* Few servings (1-3) */
.inventory-card[data-stock="few"] {
  box-shadow:
    2px 2px 0 0 rgba(255, 176, 0, 0.3),
    4px 4px 0 0 rgba(255, 176, 0, 0.2);
}

/* Some servings (4-10) */
.inventory-card[data-stock="some"] {
  box-shadow:
    2px 2px 0 0 rgba(255, 176, 0, 0.4),
    4px 4px 0 0 rgba(255, 176, 0, 0.3),
    6px 6px 0 0 rgba(255, 176, 0, 0.2);
}

/* Many servings (11+) */
.inventory-card[data-stock="many"] {
  box-shadow:
    2px 2px 0 0 rgba(255, 176, 0, 0.5),
    4px 4px 0 0 rgba(255, 176, 0, 0.4),
    6px 6px 0 0 rgba(255, 176, 0, 0.3),
    8px 8px 0 0 rgba(255, 176, 0, 0.2);
}
```

### Bar Gauge (Track Section)

Horizontal bar for calorie progress:
```
[████████████░░░] 1160 / 2000 kcal (58%)
```

Color coding:
- 0–89%: `var(--text)` amber
- 90–100%: `var(--accent)` bright amber
- 101%+: `var(--error)` red

### Weekly Trend (Track Section)

```
> weekly trend [week of 2024-01-14]

Sun  [████████████████] 2100  (105%)
Mon  [████████████░░░░] 1600  (80%)
Tue  [██████████████░░] 1850  (93%)
```

Days over target in red, under in amber. Selected day highlighted.

---

## Branding

Sparse branding. Use simple text:
```
MEALOPS v1.0.0
```

Or ASCII logo if needed:
```
███╗   ███╗███████╗ █████╗ ██╗      ██████╗ ██████╗ ███████╗
████╗ ████║██╔════╝██╔══██╗██║     ██╔═══██╗██╔══██╗██╔════╝
██╔████╔██║█████╗  ███████║██║     ██║   ██║██████╔╝███████╗
██║╚██╔╝██║██╔══╝  ██╔══██║██║     ██║   ██║██╔═══╝ ╚════██║
██║ ╚═╝ ██║███████╗██║  ██║███████╗╚██████╔╝██║     ███████║
╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝
```

---

## Responsive Design

- **Desktop-first**: optimized for 1024px+
- Terminal apps are traditionally desktop experiences
- Mobile: functional but not heavily optimized
- CSS Grid/Flexbox for natural adaptation
- Minimum supported: ~768px width recommended

---

## What to Avoid

- Sans-serif fonts
- Rounded corners
- Box shadows (except hard-edged stacking effect)
- Gradients
- Elaborate animations (quick transitions OK)
- Modal dialogs
- Toast notifications
- Icon libraries (use ASCII: `>`, `+`, `-`, `x`, `*`, `/`, `\`, `|`)
- Soft, spacious padding

## What to Embrace

- Monospaced fonts everywhere
- Flat, hard-edged rectangles
- Terminal color schemes
- Text-based UI elements
- Inline feedback and output
- Command-line metaphors
- Keyboard shortcuts
- Grid-aligned layouts
- ASCII characters for icons
- Performance and speed
