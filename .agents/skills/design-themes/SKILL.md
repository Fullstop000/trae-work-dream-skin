---
name: design-themes
description: Design, implement, review, or refine complete application themes as coherent visual systems rather than background swaps. Use for theme research and art direction, theme CSS and asset packaging, V3 semantic token coverage, backgrounds, banners, tabs, composers, messages, panels, interaction states, responsive behavior, compatibility audits, or final visual QA in this repository.
---

# Design Themes

Create a coherent product theme that remains usable across the whole application. Preserve user-approved elements and change only the requested scope.

## Follow the workflow

1. Inspect the current theme architecture, source-of-truth files, active runtime path, V3 protocol, and representative application views before editing.
2. Inventory the surfaces, components, states, layouts, and modes affected by the theme.
3. Research the visual source when the theme depends on a historical era, cultural style, franchise, or unfamiliar subject. Extract a design grammar before proposing UI.
4. State the design direction and intended scope. Distinguish preserved elements from elements being redesigned.
5. Implement the theme in its own CSS and asset package. Keep shared loaders and protocol code theme-agnostic.
6. Apply through the repository's supported runtime or CLI path when the user requests implementation. Do not silently patch only a generated or installed copy.
7. Verify the coverage matrix and interaction states at real viewport sizes. Diagnose geometry using computed coordinates rather than screenshots alone.
8. Report what changed, what was deliberately preserved, the views verified, and any remaining risk.

When implementing in this repository, read `../../../docs/schema-v3.md` and the active theme files before changing protocol or token behavior.

## Apply the nine rules

### 1. Use one background coordinate system

- Let one stable root layer own the main artwork.
- Keep the main background fixed when left or right panels open.
- Render sidebars and auxiliary panels as transparent or translucent surfaces over that root when appropriate.
- Never let multiple regions independently draw the same `cover` image; that causes duplicated subjects, discontinuities, and recropping.
- Verify left panel, right panel, and both panels together.

### 2. Package theme-specific behavior with the theme

- Keep banners, tabs, composer decoration, theme animations, and theme assets in the theme package.
- Keep `skin.js`, injectors, loaders, and protocol bridges generic.
- Avoid hard-coding theme selectors or branded behavior into shared runtime code.
- Keep repository source, packaged CLI content, and active runtime behavior aligned.

### 3. Build a design language, not a color swap

Before styling components, extract a compact grammar:

| Dimension | Decide |
| --- | --- |
| Shape | Corners, silhouettes, framing, geometry |
| Material | Paper, wood, glass, metal, fabric, ink, light |
| Pattern | Motifs, rhythm, density, placement |
| Typography | Tone, hierarchy, tracking, numeral treatment |
| Motion | Physical metaphor, duration, easing, restraint |
| Color | Roles and contrast, not just a palette |

Do not reuse another theme's component skeleton merely by recoloring it. Derive banner, tab, composer, and message treatments from the new grammar.

### 4. Design complete interaction states

Cover default, hover, focus, active, selected, disabled, loading, empty, and populated states. Use themed motion as feedback, not constant decoration. Keep interactions short, legible, and compatible with `prefers-reduced-motion`.

### 5. Treat V3 as a semantic role protocol

Map semantic roles instead of individual screenshots. Cover at least:

- Root, sidebar, panel, card, input, and overlay surfaces
- Primary, secondary, disabled, inverse, and link text
- Borders, dividers, focus rings, selection, hover, and active states
- Buttons, toggles, selects, menus, dialogs, tooltips, toasts, and scrollbars
- Empty, loading, error, and success states
- Required VS Code core variables and application-specific role variables

Do not declare protocol coverage complete after only checking the chat landing page.

### 6. Verify every mode and representative page separately

At minimum, check:

- Work, Code, and Design landing states
- Active chat with short and long messages
- IM Channel
- Theme Manager
- Task Summary or other right-side panels
- Empty, loading, error, menu, dialog, and settings states
- Left sidebar collapsed and expanded

Shared components can have different DOM, copy length, or state defaults across modes.

### 7. Keep decoration subordinate to information

- Protect text contrast and control discoverability.
- Keep detailed motifs denser in banners and lighter in working areas.
- Do not place important character or motif details behind long-form text.
- Prevent ornament from covering carets, badges, toolbars, focus rings, or status text.
- Use overlays intentionally; transparency must improve continuity without harming readability.

### 8. Scope CSS and prefer stable selectors

- Prefix every theme rule with the theme root class.
- Prefer stable component and semantic classes over deep DOM chains or generated class names.
- Keep mode-specific exceptions narrow.
- Use `!important` only where the host cascade requires it, and avoid global overrides.
- Ensure pseudo-elements do not capture pointer events unless they are interactive.
- Keep z-index and overflow behavior local and explicit.

When changing padding, size, or positioning, also inspect dependent placeholders, badges, icons, pseudo-elements, focus rings, dividers, toolbars, and popover anchors. In particular, compare empty placeholder coordinates with real typed-content coordinates; absolute positioning often preserves stale host offsets.

### 9. Finish with a fixed acceptance checklist

- Theme survives switch, refresh, navigation, and supported CLI restart.
- Main background does not move, repeat, or recrop when panels open.
- Banner, tabs, composer, and messages share the theme grammar without copying another theme.
- Empty placeholder, typed text, icons, and dividers align.
- Hover, focus, active, selected, and disabled states remain distinguishable.
- Text remains readable over artwork and translucent panels.
- Work, Code, Design, IM Channel, Manager, and side panels are covered.
- Layout works at representative narrow and wide widths.
- Visual checks account for CSS pixels versus device pixels on Retina displays.
- Animations respect reduced-motion preferences.
- Theme rules do not leak into other themes.
- Repository source and the actual CLI-loaded version match.

## Review before completion

Do not redesign approved background art when the request targets only component framing or interactions. Do not call a theme complete from a single polished screenshot. Prefer a small number of meaningful motifs applied consistently over many unrelated decorations.

Communicate findings and handoff in the user's language.
