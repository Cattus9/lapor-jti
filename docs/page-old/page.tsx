import {
  Activity, Bell, CalendarDays, ChevronRight, CircleHelp, FileText,
  LayoutDashboard, Settings, Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Reports", icon: FileText }, { label: "Team", icon: Users }, { label: "Settings", icon: Settings },
];
const metrics = [
  { label: "Total reports", value: "128", detail: "+12.5% this month", icon: FileText },
  { label: "Active members", value: "24", detail: "+3 new members", icon: Users },
  { label: "Resolution rate", value: "86.4%", detail: "+4.2% from last month", icon: Activity },
];

export default function Home() {
  return (
    <div className="flex min-h-screen w-full gap-3 overflow-hidden bg-sidebar p-3 text-sidebar-foreground">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar px-3 py-6 max-md:w-16 max-md:px-2">
        <div className="-mx-1 flex items-center gap-3 px-1 py-2"><div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Activity className="size-5" /></div><div className="max-md:hidden"><p className="font-semibold tracking-tight">LaporJTI</p><p className="text-xs text-muted-foreground">Workspace</p></div></div>
        <nav className="-mx-1 mt-9 space-y-2" aria-label="Main navigation"><p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground max-md:hidden">Menu</p>{navigation.map(({ label, icon: Icon, active }) => <Button key={label} variant={active ? "secondary" : "ghost"} className="h-10 w-full justify-start gap-3 px-2 text-sm max-md:justify-center max-md:px-0"><Icon className="size-4" /><span className="max-md:hidden">{label}</span></Button>)}</nav>
        <div className="-mx-1 mt-auto space-y-2"><Button variant="ghost" className="h-10 w-full justify-start gap-3 px-2 max-md:justify-center max-md:px-0"><CircleHelp className="size-4" /><span className="max-md:hidden">Help center</span></Button><div className="mt-5 flex items-center gap-3 border-t border-sidebar-border px-1 pt-5"><Avatar className="size-9"><AvatarFallback>AS</AvatarFallback></Avatar><div className="min-w-0 max-md:hidden"><p className="truncate text-sm font-medium">Ayu Santoso</p><p className="truncate text-xs text-muted-foreground">Administrator</p></div></div></div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto rounded-3xl border border-border bg-background p-6 text-foreground shadow-xs md:p-8">
        <header className="mb-8 flex flex-col gap-1"><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-sm font-medium text-primary">Monday, 13 September 2026</p><h1 className="text-3xl font-semibold tracking-tight text-foreground">Good morning, Ayu</h1></div><Button variant="outline" size="icon" aria-label="Notifications"><Bell className="size-4" /></Button></div><p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your reports today.</p></header>
        <section className="space-y-6"><div className="grid gap-4 md:grid-cols-3">{metrics.map(({ label, value, detail, icon: Icon }) => <Card key={label}><CardHeader className="flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl">{value}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>)}</div>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Recent reports</CardTitle><CardDescription>Latest activity from your workspace.</CardDescription></div><Button variant="ghost" size="sm">View all<ChevronRight className="size-4" /></Button></CardHeader><CardContent className="space-y-4">{[{ title: "Lampu ruang kelas mati", place: "Gedung A · 12 minutes ago", status: "In review" }, { title: "Proyektor tidak menyala", place: "Lab Komputer · 1 hour ago", status: "Resolved" }, { title: "Koneksi Wi-Fi lambat", place: "Perpustakaan · 3 hours ago", status: "Open" }].map((report) => <div key={report.title} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.place}</p></div><Badge variant={report.status === "Resolved" ? "secondary" : "outline"}>{report.status}</Badge></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Upcoming schedule</CardTitle><CardDescription>Your next activities.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-primary" /><div><p className="text-sm font-medium">Weekly team review</p><p className="text-xs text-muted-foreground">Tomorrow · 09:00 WIB</p></div></div><div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 text-primary" /><div><p className="text-sm font-medium">Facilities sync</p><p className="text-xs text-muted-foreground">Wednesday · 14:30 WIB</p></div></div></CardContent></Card></div>
        </section>
      </main>
    </div>
  );
}
