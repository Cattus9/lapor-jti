## Wajib!! semua iterasi/proses development frentend HARUS menggunakan skills di @.agent/skills/design-taste-frontend, yang memastikan desain dan tata letak yang konsisten dengan standar ShadCN dan SEMUA komponent WAJIB pakai Shadcn.

## Shadcn Primitive Customization
- Shadcn primitives in `src/components/ui` MAY be edited when a shared visual, interaction, accessibility, or responsive behavior requires it.
- A primitive change applies to every component that consumes it; assess that shared impact before editing and preserve the primitive API unless a clean migration of all callers is part of the change.
- The user-provided context, visual references, and explicit constraints define the scope and take precedence over generic Shadcn defaults.
- Keep changes aligned with the existing Shadcn design system, semantic HTML, keyboard behavior, focus states, and accessibility requirements.

## KPI Card Standard
- KPI cards MUST use a layered Shadcn `Card` composition: an outer `bg-sidebar` wrapper and an inner `bg-card` content surface.
- Outer card styling: `border border-border rounded-2xl p-1.5 flex flex-col justify-between overflow-hidden shadow-xs`.
- Inner card styling: `border border-border/60 rounded-xl p-4 space-y-3 shadow-2xs`.
- Main metric MUST use a semantic Lucide icon inside a `size-10 rounded-xl bg-background border border-border` badge, followed by a muted label and prominent value.
- Sub-information is conditional. When provided, it MUST include a `border-t border-border/60` divider, muted status label, indicator dot, and semantic status value.
- Footer action MUST remain outside the inner card, use `px-3 py-2`, and use a subtle `ArrowRight` affordance.
- KPI colors MUST use theme tokens or restrained semantic utility colors; arbitrary hex colors are prohibited.
- This standard applies across dashboard roles; role-specific data may vary, but the visual composition remains consistent.

### Dashboard KPI Implementation Rule
- Every dashboard KPI MUST use the reusable `KpiCard` composition so sizing, spacing, icon treatment, and responsive behavior stay consistent across roles.
- The outer layer MUST include a bottom affordance labeled `Detail` with a subtle `ArrowRight`; use a link when a detail route exists and a non-interactive footer while the route is still pending.
- Role-specific dashboards MUST not recreate KPI card markup locally or introduce a different footer label/style.


## Icon Selection Priority
- Use Lucide icons that are semantically specific to the feature or action whenever a suitable icon exists.
- Prefer expressive, context-appropriate variants over repeatedly using generic icons such as `LayoutDashboard`, `FileText`, `Users`, or `Settings`.
- Keep icon selection visually varied across navigation sections while preserving Lucide's consistent stroke style.
- Use a generic icon only when no sufficiently specific Lucide icon is available or when the generic icon is clearer for the user.
- Confirm icon names and availability in the installed `lucide-react` package before implementation.
