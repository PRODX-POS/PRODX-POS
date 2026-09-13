# PRODX AI Design Contract

AI-generated UI is acceptable only when it conforms to the existing PRODX design system and POS interaction rules.

## Inputs

A design review may use:

- React/TypeScript component source
- Tailwind/CSS source
- ThemeContext and design tokens
- component props and states
- accessibility semantics and labels
- responsive breakpoints
- screenshots only when explicitly classified and redacted for external model use

## Visual review checklist

### Hierarchy
- Primary action is visually dominant and unambiguous.
- Transaction totals, payment state, errors, and confirmation state are immediately scannable.
- Secondary controls do not compete with cashier-critical actions.

### POS interaction
- Touch targets are sufficiently large for tablet/cashier use.
- Barcode/keyboard workflows remain fast.
- Focus order is predictable.
- Loading, empty, error, offline, retry, and success states are explicit.
- Destructive actions have clear confirmation and authorization semantics.

### Design system
- Reuse existing theme variables and component primitives.
- Avoid arbitrary hard-coded colors, radii, shadows, typography, and spacing when tokens exist.
- Keep the six existing premium theme presets visually coherent.
- Prefer reusable variants over page-specific CSS duplication.

### Accessibility
- Text and controls have adequate contrast.
- Focus-visible states are present.
- Icon-only actions have accessible names.
- Form errors are associated with their controls.
- Semantic headings and landmarks are preserved.
- Responsive layouts do not hide critical transactional information.

### Responsive behavior
- Validate desktop, tablet, and narrow layouts.
- Preserve cashier-critical controls without horizontal overflow.
- Do not rely on hover-only interaction.

## AI output contract

AI should return:

1. Severity: low / medium / high / critical.
2. Concrete evidence from the changed code or supplied visual artifact.
3. User/business impact.
4. Minimal remediation that preserves the design system.
5. Validation commands or deterministic checks that can prove the fix.

AI must not claim visual correctness from source code alone when a visual artifact is required to establish the issue. AI must not directly mutate production data or bypass accessibility/build/theme gates.
