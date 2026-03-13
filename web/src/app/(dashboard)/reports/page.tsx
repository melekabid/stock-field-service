'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { fetchReports } from '@/lib/api/queries';

export default function ReportsPage() {
  const { data } = useQuery({ queryKey: ['report-summary'], queryFn: fetchReports });

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Rapports"
          title="Synthese & performance"
          description="Visualisez rapidement les volumes par statut avant de descendre dans les pages de gestion detaillees."
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {(data ?? []).map((entry) => (
            <Card key={entry.status} className="glass-panel rounded-[2rem]">
              <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">{entry.status}</p>
              <p className="mt-4 text-5xl font-black text-slate-900">{entry._count}</p>
            </Card>
          ))}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
