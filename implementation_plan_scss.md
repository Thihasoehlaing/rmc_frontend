# Enterprise SCSS Design System — Implementation Plan

Create a modern, enterprise-grade SCSS design system with structured tokens, 8px spacing, elevation, animation, and z-index systems. All existing color values are preserved. No functionality changes.

## Current State Analysis

| File | Status | Issues Found |
|------|--------|-------------|
| [_colors.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_colors.scss) | Exists | Missing hover shades, no semantic aliases for surfaces/overlays |
| [_typography.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_typography.scss) | Exists | No font-size scale, no line-height tokens, button sizes misplaced here |
| [_sizes.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_sizes.scss) | Exists | No 8px spacing scale, no border-radius scale, no collapsed sidebar width |
| [_layout.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_layout.scss) | Exists | Column mixins use hardcoded `16px` gap |
| [_breakpoints.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_breakpoints.scss) | Exists | Missing tablet-landscape breakpoint, uses hardcoded px in mixins |
| [_flexbox.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_flexbox.scss) | Exists | **Empty** — just a comment |
| [_forms.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_forms.scss) | Exists | Has hardcoded `#dadada` hover color, hardcoded `rgba()` shadow |
| `_elevation.scss` | **Missing** | No shadow/elevation system |
| `_animations.scss` | **Missing** | No transition/animation tokens |
| [_index.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_index.scss) | Exists | Uses deprecated `@import` |
| Component SCSS files | Exists | 15+ hardcoded hex colors (`#fff`, `#f5f5f5`, `#f0f0f0`, `#f9f9f9`, etc.) |

---

## Proposed Changes

### Design Token Files

#### [MODIFY] [_colors.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_colors.scss)

Keep every existing value. Add:
- **Hover shades**: `--color-primary-hover`, `--color-secondary-hover` (generated darker)
- **Surface tokens**: `--color-surface`, `--color-surface-hover`, `--color-surface-active`, `--color-surface-nested`
- **Overlay**: `--color-overlay` (for modals)
- **Text secondary**: `--color-text-secondary` for muted text
- **Border hover**: `--border-hover` for input hover states

```diff
+  // Hover Shades (darkened from originals)
+  --color-primary-hover: #1B6FE0;
+  --color-secondary-hover: #0E0C54;
+
+  // Surfaces
+  --color-surface: #ffffff;
+  --color-surface-hover: #f5f7fa;
+  --color-surface-active: #eef2f7;
+  --color-surface-nested: #f9fafb;
+
+  // Overlay
+  --color-overlay: rgba(0, 0, 0, 0.6);
+
+  // Text
+  --color-text-secondary: #6c757d;
+
+  // Border
+  --border-hover: #dadada;
```

---

#### [MODIFY] [_typography.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_typography.scss)

Keep font-family and button sizes. Add:
- **Font-size scale**: `--fs-xs` through `--fs-2xl`
- **Line-height scale**: `--lh-tight`, `--lh-normal`, `--lh-relaxed`
- **Font-weight tokens**: `--fw-normal`, `--fw-medium`, `--fw-semibold`, `--fw-bold`

```diff
+  // Font Size Scale
+  --fs-xs: 0.75rem;      // 12px
+  --fs-sm: 0.85rem;      // ~13.6px
+  --fs-base: 1rem;       // 16px
+  --fs-md: 1.125rem;     // 18px
+  --fs-lg: 1.25rem;      // 20px
+  --fs-xl: 1.5rem;       // 24px
+  --fs-2xl: 1.75rem;     // 28px
+
+  // Line Height
+  --lh-tight: 1.2;
+  --lh-normal: 1.5;
+  --lh-relaxed: 1.75;
+
+  // Font Weight
+  --fw-normal: 400;
+  --fw-medium: 500;
+  --fw-semibold: 600;
+  --fw-bold: 700;
```

---

#### [MODIFY] [_sizes.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_sizes.scss)

Keep existing values. Add:
- **8px spacing scale**: `--space-1` (4px) through `--space-12` (96px)
- **Border-radius scale**: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`
- **Sidebar collapsed width**: `--sidebar-collapsed-width: 64px`
- **Icon size system**: `--icon-sm`, `--icon-md`, `--icon-lg`
- **Z-index scale**: `--z-dropdown` through `--z-modal`

```diff
+  // 8px Spacing Scale
+  --space-1: 4px;
+  --space-2: 8px;
+  --space-3: 12px;
+  --space-4: 16px;
+  --space-5: 20px;
+  --space-6: 24px;
+  --space-7: 32px;
+  --space-8: 40px;
+  --space-9: 48px;
+  --space-10: 56px;
+  --space-11: 64px;
+  --space-12: 96px;
+
+  // Border Radius Scale
+  --radius-sm: 4px;
+  --radius-md: 6px;
+  --radius-lg: 8px;
+  --radius-xl: 12px;
+  --radius-full: 9999px;
+
+  // Sidebar
+  --sidebar-collapsed-width: 64px;
+
+  // Icon Sizes
+  --icon-sm: 16px;
+  --icon-md: 20px;
+  --icon-lg: 28px;
+
+  // Z-Index Scale
+  --z-dropdown: 100;
+  --z-sticky: 200;
+  --z-fixed: 300;
+  --z-overlay: 400;
+  --z-modal: 500;
+  --z-toast: 600;
```

---

#### [NEW] [_elevation.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_elevation.scss)

Shadow token system for consistent depth:

```scss
:root {
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.08), 0 8px 10px rgba(0, 0, 0, 0.04);
  --shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-focus: 0 0 0 3px rgba(42, 131, 255, 0.15);
}
```

---

#### [NEW] [_animations.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_animations.scss)

Transition and easing tokens:

```scss
:root {
  --transition-fast: 150ms;
  --transition-base: 250ms;
  --transition-slow: 350ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

#### [MODIFY] [_breakpoints.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_breakpoints.scss)

Convert to SCSS variables for use in mixins. Add `tablet-landscape`. Add column-stacking mixins:

```diff
-:root {
-  --bp-mobile: 600px;
-  --bp-tablet: 900px;
-  --bp-desktop: 1200px;
-}
+// SCSS variables (usable in media queries)
+$bp-mobile: 600px;
+$bp-tablet: 900px;
+$bp-tablet-landscape: 1024px;
+$bp-desktop: 1200px;
+
+// CSS custom properties (usable in JS if needed)
+:root {
+  --bp-mobile: #{$bp-mobile};
+  --bp-tablet: #{$bp-tablet};
+  --bp-tablet-landscape: #{$bp-tablet-landscape};
+  --bp-desktop: #{$bp-desktop};
+}

-@mixin mobile { @media (max-width: 600px) { @content; } }
-@mixin tablet { @media (min-width: 601px) and (max-width: 900px) { @content; } }
-@mixin desktop { @media (min-width: 901px) { @content; } }
+@mixin mobile { @media (max-width: $bp-mobile) { @content; } }
+@mixin tablet { @media (min-width: ($bp-mobile + 1)) and (max-width: $bp-tablet) { @content; } }
+@mixin tablet-landscape { @media (min-width: ($bp-tablet + 1)) and (max-width: $bp-tablet-landscape) { @content; } }
+@mixin desktop { @media (min-width: ($bp-tablet + 1)) { @content; } }
+@mixin desktop-wide { @media (min-width: ($bp-desktop + 1)) { @content; } }
```

---

#### [MODIFY] [_layout.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_layout.scss)

Replace hardcoded `16px` gap with `var(--space-4)`. Add responsive stacking using SCSS variable breakpoints:

```diff
-@mixin col-50-50 {
-  display: flex;
-  gap: 16px;
-  & > * { flex: 1 1 50%; }
-}
+@mixin col-50-50 {
+  display: flex;
+  gap: var(--space-4);
+  & > * { flex: 1 1 calc(50% - var(--space-4)); min-width: 0; }
+}
```

Same pattern for all column mixins. Add a `.container` class for page max-width.

---

#### [MODIFY] [_forms.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_forms.scss)

Replace hardcoded values with tokens:

```diff
-  &:hover { border-color: #dadada; }
+  &:hover { border-color: var(--border-hover); }

-  box-shadow: 0 0 0 3px rgba(42, 131, 255, 0.08);
+  box-shadow: var(--shadow-focus);
```

Add global button classes (`.btn-primary`, `.btn-secondary`, `.btn-large`, `.btn-list`), textarea class, and select class.

---

#### [MODIFY] [_flexbox.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_flexbox.scss)

Add utility classes: `.flex`, `.flex-col`, `.flex-center`, `.flex-between`, `.gap-*` helpers.

---

#### [MODIFY] [_index.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_index.scss)

Migrate from `@import` to `@use` / `@forward`. Add new files:

```diff
-@import 'colors';
-@import 'typography';
-@import 'sizes';
+@use 'colors';
+@use 'typography';
+@use 'sizes';
+@use 'elevation';
+@use 'animations';
+@use 'breakpoints';
+@use 'layout';
+@use 'flexbox';
+@use 'forms';
```

> [!IMPORTANT]
> `@use` scoping means these files define `:root` custom properties, which work globally. Mixins inside [_layout.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_layout.scss) and [_breakpoints.scss](file:///c:/Users/d16/RMC_project/src/assets/styles/_breakpoints.scss) will need `@forward` to be usable in component SCSS files.

---

### Component SCSS Updates

#### [MODIFY] [sidebar.component.scss](file:///c:/Users/d16/RMC_project/src/app/layout/sidebar/sidebar.component.scss)

Replace ~10 hardcoded hex values (`#fff`, `#f5f5f5`, `#f9f9f9`, `#f0f0f0`, `64px`) with design tokens.

#### [MODIFY] [dashboard.component.scss](file:///c:/Users/d16/RMC_project/src/app/layout/dashboard/dashboard.component.scss)

Replace `#fff`, hardcoded shadows, `4px` radius, `600px` media query with tokens.

#### [MODIFY] [profile.component.scss](file:///c:/Users/d16/RMC_project/src/app/layout/profile/profile.component.scss)

Replace `#fff`, `600px` media query, hardcoded paddings with tokens.

#### [MODIFY] [layout.component.scss](file:///c:/Users/d16/RMC_project/src/app/layout/layout.component.scss)

Replace `#fff`, `#f5f5f5` with surface tokens.

---

## Verification Plan

### Automated Tests

1. **Build verification**: Run `ng serve` and confirm zero errors
   ```
   cd c:\Users\d16\RMC_project && npx ng serve
   ```
   Expected: "Application bundle generation complete" with no `[ERROR]` lines.

2. **Deprecation warning reduction**: The `@import` → `@use` migration should reduce/eliminate the Sass deprecation warnings that were showing before.

### Manual Verification

1. Open `http://localhost:4200/` in browser
2. Check **Dashboard page** — cards should have same visual appearance (white background, border, hover shadow)
3. Check **Profile page** (`/profile`) — form inputs, sections, buttons should look identical
4. Check **Sidebar** — expand/collapse, hover, folder open/close should all work and look the same
5. Resize browser to mobile width (<600px) — responsive behavior should remain intact
6. Verify no hardcoded hex colors remain in component SCSS files by running:
   ```
   cd c:\Users\d16\RMC_project && npx rg "#[0-9a-fA-F]{3,6}" src/app --include "*.scss" --include "*.css"
   ```
