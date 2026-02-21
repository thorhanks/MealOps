# MealOps — Animation Effects Plan

Terminal/CRT-themed animations that fit the hacker aesthetic. Implement one at a time.

---

## 1. Button Press Flash

**Complexity:** Trivial (CSS-only)
**Files:** `styles/main.css`

When buttons like `[view]`, `[eat]`, `[+ made]` are clicked, briefly invert colors (amber bg, dark text) for ~100ms, simulating a terminal key-press flash.

```css
.btn:active {
  background: var(--text);
  color: var(--bg);
  transition: none; /* snap on */
}
/* existing transition handles the fade back */
```

---

## 2. Card Entrance Stagger

**Complexity:** Low (CSS keyframes + minor JS)
**Files:** `styles/main.css`, `components/eat-view.js`, `components/cook-view.js` (or wherever cards render)

When recipe or eat card grids load, stagger cards in with a subtle fade + upward shift. Each card gets an increasing `animation-delay` (50ms increments).

```css
@keyframes card-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.card-grid > * {
  animation: card-in 150ms ease-out both;
}
```

JS sets `style="animation-delay: ${i * 50}ms"` on each card during render.

---

## 3. Command Palette Drop-In

**Complexity:** Low (CSS transition)
**Files:** `styles/main.css`, `components/command-palette.js`

Instead of instant show/hide, the command palette slides down from the top with a quick `translateY(-20px) -> 0` + `opacity` transition (~150ms).

```css
.command-palette {
  opacity: 0;
  transform: translateY(-20px);
  transition: opacity 150ms, transform 150ms;
  pointer-events: none;
}

.command-palette.active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
```

Swap `display: none/block` toggling for the class-based approach (use `visibility` or `pointer-events` to keep it non-interactive when hidden).

---

## 4. Typewriter Status Messages

**Complexity:** Moderate (JS helper)
**Files:** new utility or inline in components that show status messages

Status messages (`OK: recipe saved`, `ERROR: failed to save`) type out character-by-character instead of appearing instantly.

```js
function typewrite(el, text, speed = 30) {
  el.textContent = '';
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, speed);
    }
  };
  tick();
}
```

Call `typewrite(msgEl, 'OK: recipe saved [id:abc123]')` instead of setting `textContent` directly.

---

## 5. CRT Power-On View Transitions

**Complexity:** Moderate (CSS keyframes)
**Files:** `styles/main.css`, `app.js`

When switching between Cook/Eat/Track views, simulate a CRT monitor scan-in. The new view "draws" top-to-bottom via `clip-path`.

```css
@keyframes crt-on {
  0%   { clip-path: inset(0 0 100% 0); }
  100% { clip-path: inset(0); }
}

.view.active {
  animation: crt-on 200ms ease-out;
}
```

Optional: add a 1-frame white flash before the scan by layering a pseudo-element that flashes `opacity: 1 -> 0` over ~50ms.

---

## 6. Scanline Glitch on Errors

**Complexity:** Moderate (CSS keyframes)
**Files:** `styles/main.css`

When an error message appears, trigger a brief "glitch" — horizontal jitter + color channel split via `text-shadow` for ~200ms.

```css
@keyframes glitch {
  0%   { transform: translateX(0);   text-shadow: none; }
  20%  { transform: translateX(-2px); text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; }
  40%  { transform: translateX(2px);  text-shadow: -2px 0 #ff0000, 2px 0 #00ffff; }
  60%  { transform: translateX(-1px); text-shadow: 1px 0 #ff0000, -1px 0 #00ffff; }
  80%  { transform: translateX(1px);  text-shadow: none; }
  100% { transform: translateX(0);    text-shadow: none; }
}

.msg-error {
  animation: glitch 200ms linear;
}
```

---

## 7. SVG Chart Draw-In

**Complexity:** Moderate (CSS/SVG transitions)
**Files:** `components/bar-gauge.js`, `components/body-gauge.js`, `components/weekly-trend.js`

Animate SVG paths/arcs drawing in using `stroke-dasharray`/`stroke-dashoffset`. Segments "trace" themselves instead of popping in.

```css
.chart-segment {
  stroke-dasharray: var(--len);
  stroke-dashoffset: var(--len);
  transition: stroke-dashoffset 400ms ease-out;
}

.chart-segment.drawn {
  stroke-dashoffset: 0;
}
```

JS: set `--len` to path's `getTotalLength()`, then add `.drawn` class after a frame.

---

## 8. Cursor Blink on Active Input

**Complexity:** Low (CSS-only)
**Files:** `styles/main.css`

Add a blinking block cursor next to focused inputs using a step animation on a pseudo-element.

```css
.input:focus::after {
  content: '\2588'; /* full block character */
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
```

May need a wrapper element since `::after` doesn't work on `<input>`. Alternative: style the native caret with `caret-color: var(--text)` and `caret-shape: block` (limited browser support).


---

## Implementation Order (suggested)

1. Button press flash — instant win, zero risk
2. Card entrance stagger — grids feel alive
3. Command palette drop-in — polishes existing feature
4. Typewriter status messages — iconic terminal feel
5. CRT power-on view transitions — ties the sections together
6. Scanline glitch on errors — visual error distinction
7. SVG chart draw-in — data visualization polish
8. Cursor blink on active input — small detail
