import { useEffect, useState, type CSSProperties } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../features/auth/AuthProvider";
import { CommandPalette } from "./CommandPalette";

const Logo = () => <span className="text-2xl font-extrabold tracking-tight">Lot<span className="logo-slash text-accent">/</span>wise</span>;

const PAGES = [
  { to: "/inventory", label: "Inventory", admin: false },
  { to: "/manage", label: "Manage Vehicles", admin: true },
  { to: "/activity", label: "Activity", admin: true },
];

/** App shell: sidebar on desktop, thumb-reach tab bar on phones, command palette. */
export function Layout() {
  const { user, signOut } = useSession();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isAdmin = user?.role === "ADMIN";
  const pages = PAGES.filter((p) => isAdmin || !p.admin);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = Math.max(0, pages.findIndex((p) => pathname.startsWith(p.to)));
  const side = "rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="bg-ink bg-[radial-gradient(110%_45%_at_0%_0%,rgb(217_72_15/0.3),transparent_65%)] text-[#f6f3ec] max-md:sticky max-md:top-0 max-md:z-30 md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="flex items-center justify-between px-5 py-4 md:px-6 md:py-7">
          <Logo />
          <div className="flex gap-2 md:hidden">
            <button className={side} onClick={() => setPaletteOpen(true)} aria-label="Search">⌕</button>
            <button className={side} onClick={signOut}>Sign out</button>
          </div>
        </div>

        <button onClick={() => setPaletteOpen(true)} className="mx-3 mb-3 hidden items-center justify-between rounded-lg border border-white/15 px-3 py-2 text-sm text-[#f6f3ec]/60 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent md:flex">
          Search… <kbd className="rounded border border-white/20 px-1.5 text-xs">Ctrl K</kbd>
        </button>

        <nav aria-label="Primary" style={{ "--i": current, "--n": pages.length } as CSSProperties}
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-ink md:relative md:flex-1 md:flex-col md:gap-1 md:border-0 md:px-3">
          <span aria-hidden className="slider absolute top-0 left-0 h-0.5 w-[calc(100%/var(--n))] translate-x-[calc(var(--i)*100%)] bg-accent md:inset-x-3 md:h-10 md:w-auto md:translate-x-0 md:translate-y-[calc(var(--i)*2.75rem)] md:rounded-lg md:bg-white/10 md:before:absolute md:before:inset-y-2 md:before:left-0 md:before:w-0.5 md:before:rounded md:before:bg-accent" />
          {pages.map((p, i) => (
            <NavLink key={p.to} to={p.to} style={{ animationDelay: `${i * 70}ms` }}
              className={({ isActive }) => `rise relative z-10 flex-1 px-3 py-4 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:flex-none md:py-0 md:text-left md:leading-10 ${isActive ? "text-white" : "text-[#f6f3ec]/60 hover:text-white"}`}>
              {p.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-5 md:block">
          <p className="truncate text-sm font-semibold">{user?.email}</p>
          <p className="text-sm text-[#f6f3ec]/60">{isAdmin ? "Administrator" : "Staff"}</p>
          <button className={`${side} mt-3 w-full`} onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 pb-28 sm:px-8 md:px-10 md:py-9 md:pb-16">
        <div key={pathname} className="rise"><Outlet /></div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
