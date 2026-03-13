'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { loginRequest } from '@/lib/api/queries';
import { saveSession } from '@/lib/auth/session';
import { extractApiMessage } from '@/lib/api/error';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError('');

    try {
      const response = await loginRequest(String(formData.get('email')), String(formData.get('password')));
      saveSession(response.accessToken, response.user);
      router.push('/dashboard');
    } catch (caught) {
      setError(extractApiMessage(caught, 'Connexion impossible. Verifiez les identifiants et la disponibilite de l’API.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#081d49_0%,#0f4cc9_45%,#eaf2ff_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/12 bg-slate-950/15 p-8 text-white shadow-2xl shadow-blue-950/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(138,180,255,0.24),transparent_26%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-4 rounded-[1.8rem] border border-white/12 bg-white/8 px-5 py-4">
                <Image
                  src="/branding/sacoges_logo.png"
                  alt="SACOGES"
                  width={78}
                  height={78}
                  className="rounded-full"
                  priority
                />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.4em] text-blue-100/90">SACOGES</p>
                  <p className="mt-2 text-lg font-black">Commerce et Service</p>
                  <p className="mt-1 text-sm text-blue-100/70">Dashboard operations & interventions</p>
                </div>
              </div>

              <div className="mt-16 max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-100/80">Portail web</p>
                <h1 className="mt-4 text-5xl font-black leading-[1.05]">
                  Une vraie dashboard terrain, claire, forte et pilotable.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-blue-50/80">
                  Retrouvez les interventions, le stock, les utilisateurs, les rapports et toutes les operations
                  administratives dans une experience visuelle coherente avec l’application mobile.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.8rem] border border-white/12 bg-white/10 p-5">
                <Wrench className="text-white" size={22} />
                <p className="mt-4 text-lg font-black">Interventions & PDF</p>
                <p className="mt-2 text-sm leading-6 text-blue-100/75">
                  Suivi de bout en bout des fiches, des signatures, des statuts et des exports.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-white/12 bg-white/10 p-5">
                <ShieldCheck className="text-white" size={22} />
                <p className="mt-4 text-lg font-black">Administration securisee</p>
                <p className="mt-2 text-sm leading-6 text-blue-100/75">
                  Utilisateurs, roles, catalogue produits et mouvements de stock centralises.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="glass-panel w-full max-w-xl rounded-[2.4rem] px-8 py-9"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-600">Connexion</p>
            <h2 className="mt-3 text-4xl font-black text-slate-900">Acceder a la dashboard</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Connectez-vous pour gerer les stocks, les interventions, les utilisateurs et les tableaux
              d’administration.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue="admin@example.com"
                  placeholder="admin@example.com"
                  className="field"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue="ChangeMe123!"
                  placeholder="Votre mot de passe"
                  className="field"
                />
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="btn-primary mt-7 w-full py-4 text-base">
              {loading ? 'Connexion en cours...' : 'Entrer dans la dashboard'}
              <ArrowRight size={18} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
