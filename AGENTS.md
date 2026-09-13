## Wajib!! semua iterasi/proses development frentend HARUS menggunakan skills di @.agent/skills/design-taste-frontend, yang memastikan desain dan tata letak yang konsisten dengan standar ShadCN dan SEMUA komponent WAJIB pakai Shadcn.

## Strict Design & Layout Rules (ShadCN Standard)

### 1. Hard Rule: Strict Token Mapping (`global.css`)
- NEVER use arbitrary Tailwind colors (e.g., `bg-white`, `bg-gray-100`, `bg-slate-900`, `bg-black`).
- ALL layout components MUST strictly map to design tokens defined in `global.css` and the [ShadCN Theming standard](https://ui.shadcn.com/docs/theming).

### 2. Contrast Mapping: Sidebar vs. Outer Canvas vs. Main Container
To achieve the floating card effect with high contrast and proper color hierarchy, map layout sections to their corresponding CSS tokens:

- **Outer Layout / Root Canvas (`<body>` or Root Wrapper):**
  - Must use `bg-sidebar` (Light: `#f8fafc` / Dark: `#020817`).
  - This matches the sidebar's background color so the sidebar visually blends into the viewport canvas.

- **Sidebar (`<aside>` / `Sidebar` Primitive):**
  - **Background:** `bg-sidebar` (Blends seamlessly with outer root).
  - **Text:** `text-sidebar-foreground`.
  - **Active/Hover States:** `bg-sidebar-accent` and `text-sidebar-accent-foreground`.
  - **Borders:** `border-sidebar-border`.

- **Main Content Area (`<main>` Floating Box):**
  - **Background (Contrast Element):** MUST use `bg-card` or `bg-background` (Light: `#ffffff` / Dark: `#020817`). 
  - **Elevation & Wrapping:** Must be wrapped with `p-3` (outer margin gap), `rounded-3xl` (or `rounded-2xl`), and `shadow-sm` or `border border-border`.
  - **Text:** `text-card-foreground` or `text-foreground`.
  - **Internal Padding:** Spaced using standard utility padding (e.g., `p-6` or `p-8`).

---

### 3. Integrated Page Header Rules
- Top navigation bars (`<header>` spanning across the screen above sidebar) are strictly forbidden.
- The Page Header must reside directly inside the `<main>` card element at the top.
- **Hierarchy Standard:**
  - `h1`: Page Title (`text-2xl` or `text-3xl`, `font-semibold`, `tracking-tight`, `text-foreground`).
  - `p` / `span`: Subtitle / Timestamp (`text-sm`, `text-muted-foreground`).
  - Actions/Tabs: Aligned horizontally or stacked below using flex/grid primitives (`flex items-center justify-between`).

---

### 4. Layout Implementation Reference

```tsx
// Outer Root Canvas (Matches Sidebar Color)
<div className="flex h-screen w-full bg-sidebar text-sidebar-foreground p-3 gap-3 overflow-hidden">
  
  {/* Sidebar Area (Seamless with background) */}
  <aside className="w-64 flex-shrink-0 flex flex-col bg-sidebar p-4">
    {/* Navigation Items using text-sidebar-foreground & bg-sidebar-accent */}
  </aside>

  {/* Main Inset Floating Card (High-Contrast Element) */}
  <main className="flex-1 bg-card text-card-foreground rounded-3xl p-6 md:p-8 overflow-y-auto shadow-sm border border-border">
    
    {/* Integrated Header Block */}
    <header className="mb-6 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {/* Dynamic Page Title (h1) */}
        </h1>
        {/* Page Actions / Controls */}
      </div>
      <p className="text-sm text-muted-foreground">
        {/* Subtitle / Context Metadata */}
      </p>
    </header>

    {/* Section Content */}
    <section className="space-y-6">
      {/* Cards, Tables, Charts, Primitive Components */}
    </section>

  </main>

</div>