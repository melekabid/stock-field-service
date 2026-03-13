'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth/session';

const items: Array<{
  href: Route;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  hint: string;
}> = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard, hint: 'Vue globale' },
  { href: '/interventions', label: 'Interventions', icon: Wrench, hint: 'Planning & suivi' },
  { href: '/stock', label: 'Stock', icon: PackageSearch, hint: 'Mouvements & alertes' },
  { href: '/products', label: 'Produits', icon: Boxes, hint: 'Catalogue & seuils' },
  { href: '/users', label: 'Utilisateurs', icon: Users, hint: 'Equipes & roles' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  return (
    <div className="dashboard-shell">
      <div className="dashboard-grid">
        <aside className="dashboard-sidebar relative px-6 py-7">
          <div className="relative z-10 flex items-center gap-4">
            <div className="rounded-[1.4rem] bg-white/10 p-2 shadow-lg shadow-black/20">
              <Image
                src="/branding/sacoges_logo.png"
                alt="SACOGES"
                width={74}
                height={74}
                className="rounded-full"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-blue-100/80">SACOGES</p>
              <h1 className="mt-2 text-2xl font-black">Commerce et Service</h1>
              <p className="mt-2 text-sm text-blue-100/75">Dashboard operations terrain</p>
            </div>
          </div>

          <div className="relative z-10 mt-8 rounded-[1.8rem] border border-white/10 bg-white/8 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/14 p-3">
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {user ? `${user.firstName} ${user.lastName}` : 'Session non disponible'}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-blue-100/70">
                  {user?.role ?? 'Sans role'}
                </p>
              </div>
            </div>
          </div>

          <nav className="relative z-10 mt-8 flex-1 space-y-2 overflow-auto pr-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-[1.4rem] px-4 py-4 transition ${
                    active
                      ? 'bg-white text-slate-900 shadow-lg shadow-blue-950/10'
                      : 'text-blue-100/84 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div
                    className={`rounded-2xl p-3 ${
                      active ? 'bg-blue-50 text-blue-700' : 'bg-white/10 text-white'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{item.label}</p>
                    <p className={`mt-1 text-xs ${active ? 'text-slate-500' : 'text-blue-100/60'}`}>{item.hint}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push('/login');
            }}
            className="relative z-10 mt-6 flex items-center justify-center gap-3 rounded-[1.3rem] border border-white/14 bg-white/6 px-4 py-4 text-sm font-bold text-white"
          >
            <LogOut size={18} />
            Deconnexion
          </button>
        </aside>

        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
