'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

const metrics = [
  'Charge par technicien',
  'Taux de completion sur 30 jours',
  'Consommation pieces par categorie',
  'Sites les plus frequents',
  'Top references sorties du stock',
  'Interventions bloquees ou annulees',
];

export default function AnalyticsPage() {
  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="KPI"
          title="Analytique"
          description="Cette zone est prete pour accueillir de vraies analyses metier, des graphiques et des tableaux de pilotage complementaires."
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="glass-panel rounded-[2rem]">
            <h2 className="text-2xl font-black text-slate-900">Cap sur la performance</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Cette page peut devenir le centre d’analyse pour la productivite terrain, la charge par equipe et les
              tendances de consommation du stock.
            </p>
          </Card>

          <Card className="glass-panel rounded-[2rem]">
            <h2 className="text-2xl font-black text-slate-900">KPIs recommandes</h2>
            <div className="mt-5 grid gap-3">
              {metrics.map((metric) => (
                <div key={metric} className="rounded-[1.4rem] border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-700">
                  {metric}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
