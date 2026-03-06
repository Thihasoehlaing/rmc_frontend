# AI & Developer Development Rules (MANDATORY)

These rules are enforced for all developers and AI assistants working on the RMC project. Adherence ensures architectural integrity and design system compliance.

---

## 🛑 1. Pre-Implementation Checklist
Before writing a single line of UI or Logic code:
1.  **Verify Shared Components**: Check `system-guidelines.md` or the `/showcase` page. If a component exists (e.g., `SearchableDropdown`), you **MUST** use it.
2.  **Verify Global Classes**: Do not recreate styles for buttons, inputs, or cards. Use existing `.btn`, `.input`, and `.card` classes.
3.  **Identify Tokens**: Identify the spacing and color tokens required for your task.

---

## 🎨 2. SCSS & Design Rules (Zero Tolerance)

### The "Zero Hardcoding" Policy
- **NO Hardcoded Pixels**: Except for `1px` borders or `50%` circles, every dimension must use a `var(--space-X)` or `var(--size-X)` token.
- **NO Hardcoded Colors**: Colors must strictly come from `var(--color-X)`. Never use hex codes or `#fff` — use the `white` CSS keyword instead.
- **NO `#fff`**: Use the CSS keyword `white` — not `#fff`, not `#ffffff`.
- **Vertical Rhythm**: Use `gap: var(--space-6)` (24px) for all primary layout sections and form-field spacing.

### Zero-Hardcoding — Allowed Exceptions (must include comment)
| Value | Reason | Required Comment |
| :--- | :--- | :--- |
| `1px` borders | Sub-token scale | `// 1px border — allowed exception` |
| `50%` | Perfect circle | `// 50% circle` |
| `2px` micro-spacing | Below --space-1 (4px) | `// no token: 2px sub-space` |
| Scrollbar dimensions | Browser control | `// no token: scrollbar — visual exception` |
| Material icon `font-size` | Pixel-perfect icon grid | `// no token: material icon pixel size` |
| Fixed component sizes (e.g. avatar 36px) | No design token exists | `// no token: [reason]` |

### Global Classes — No Local Redefinition
- **NEVER redefine `.btn`, `.card`, `.badge`, or `.input--*` locally in a component SCSS file.**
- The global classes in `_forms.scss` are the single source of truth.
- Local component SCSS may **extend** a global class (add `overflow: hidden`, override a single property) but must never duplicate the full class definition.
- ✅ Correct: `// .btn — uses global class from _forms.scss; no local override needed`
- ❌ Wrong: Defining a full `.btn { display: inline-flex; padding: ...; ... }` block in a component.

### SCSS Documentation Requirement
- Every color token defined in `_root.scss` **must** have an inline `//` comment.
- Pattern: `--color-primary: #2A83FF; // Main brand color: buttons, links, active states`
- When adding a new token to `_root.scss`, always include the comment on the same line.
- When a hardcoded value is kept (allowed exception), annotate it: `font-size: 18px; // no token: chevron ~= fs-lg (1.25rem)`

### SCSS Hierarchy
Styles must be defined in this order:
1.  **Global Logic**: `$variables` in SCSS files (no output).
2.  **Global Tokens**: mapped to `:root` in `_root.scss`.
3.  **Component Specifics**: Use tokens via `var()` as the primary way of styling.

---

## 🏗 3. Component Architecture
1.  **Standalone First**: New components should be developed as standalone components unless part of an experimental feature.
2.  **Clean Logic**: Keep templates descriptive and move complex UI logic (e.g., filtering, animations) into the TypeScript class or services.
3.  **Standard Heights**: All form controls and buttons must share the global `var(--input-height-sm)` for perfect alignment.

---

## ✅ 4. Best Practices & Maintainability
- **Self-Documentation**: If you introduce a new token or reusable class, update `system-guidelines.md` immediately.
- **Semantic HTML**: Use proper tags (`<header>`, `<nav>`, `<main>`, `<aside>`, `<section>`) to support accessibility and SEO.
- **Lazy Loading**: Respect module boundaries. Do not introduce tight coupling between feature modules.
- **Design System Reference**: `src/assets/design-system.html` is the visual reference for all tokens and global classes. Open it directly in a browser — no build needed.

---

**Failure to follow these rules justifies a mandatory refactor.**
