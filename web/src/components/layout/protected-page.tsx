'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth/session';

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (!getUser()) {
      setIsAllowed(false);
      router.push('/login');
      return;
    }

    setIsAllowed(true);
  }, [router]);

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#081d49_0%,#0f4cc9_45%,#eaf2ff_100%)] px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <div className="glass-panel rounded-[2rem] px-8 py-10 text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-600">SACOGES</p>
            <h1 className="mt-4 text-3xl font-black text-slate-900">Verification de la session</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Nous preparons la dashboard et validons votre connexion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
