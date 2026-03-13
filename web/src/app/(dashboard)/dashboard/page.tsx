'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Boxes, CheckCheck, Pencil, Plus, Search, TrendingUp, Trash2, Users, Wrench } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api/client';
import { extractApiMessage } from '@/lib/api/error';
import { fetchDashboard, fetchIncomingStock, fetchStock, fetchWarehouses } from '@/lib/api/queries';
import { getUser } from '@/lib/auth/session';
import { IncomingStockRecord, StockDashboardLine } from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = getUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    enabled: Boolean(user),
  });
  const incoming = useQuery({
    queryKey: ['incoming-stock'],
    queryFn: fetchIncomingStock,
    enabled: Boolean(user),
  });
  const stock = useQuery({
    queryKey: ['stock'],
    queryFn: fetchStock,
    enabled: Boolean(user),
  });
  const warehouses = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses,
    enabled: Boolean(user),
  });
  const [search, setSearch] = useState('');
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [editingIncoming, setEditingIncoming] = useState<IncomingStockRecord | null>(null);
  const [incomingError, setIncomingError] = useState('');
  const [incomingForm, setIncomingForm] = useState({
    productId: '',
    warehouseId: '',
    quantity: '1',
    expectedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const filteredIncoming = useMemo(() => {
    if (!incoming.data) {
      return [];
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return incoming.data.slice(0, 8);
    }
    return incoming.data
      .filter((entry) =>
        [
          entry.product?.name,
          entry.product?.code,
          entry.product?.barcode,
          entry.status,
          entry.product?.supplier?.name ?? '',
          entry.warehouse?.name ?? '',
          new Date(entry.expectedAt).toLocaleDateString('fr-FR'),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [incoming.data, search]);

  const lowStock = useMemo(
    () =>
      (data?.stock ?? [])
        .filter((line) => (line.warehouseStocks ?? []).reduce((sum, item) => sum + item.quantity, 0) <= line.alertThreshold)
        .slice(0, 5),
    [data?.stock],
  );

  const totalStockValue = useMemo(
    () =>
      (data?.products ?? []).reduce(
        (sum, product) =>
          sum +
          product.unitPrice *
            (product.warehouseStocks ?? []).reduce((quantity, stockLine) => quantity + stockLine.quantity, 0),
        0,
      ),
    [data?.products],
  );

  const stats = [
    {
      label: 'Interventions actives',
      value: String((data?.interventions ?? []).filter((item) => item.status !== 'COMPLETED').length),
      icon: Wrench,
      tone: 'from-blue-700 to-blue-500',
    },
    {
      label: 'Produits catalogues',
      value: String(data?.products?.length ?? 0),
      icon: Boxes,
      tone: 'from-cyan-700 to-sky-500',
    },
    {
      label: 'Utilisateurs',
      value: String(data?.users?.length ?? 0),
      icon: Users,
      tone: 'from-indigo-700 to-blue-500',
    },
    {
      label: 'Valeur theorique stock',
      value: formatCurrency(totalStockValue ?? 0),
      icon: TrendingUp,
      tone: 'from-emerald-700 to-teal-500',
    },
    {
      label: 'Commandes en attente',
      value: String((incoming.data ?? []).filter((item) => item.status === 'ORDERED').length),
      icon: CheckCheck,
      tone: 'from-amber-600 to-orange-500',
    },
  ];

  const saveIncomingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        productId: incomingForm.productId,
        warehouseId: incomingForm.warehouseId,
        quantity: Number(incomingForm.quantity),
        expectedAt: new Date(incomingForm.expectedAt).toISOString(),
        notes: incomingForm.notes || undefined,
      };

      if (editingIncoming) {
        return api.patch(`/stock/incoming/${editingIncoming.id}`, payload);
      }

      return api.post('/stock/incoming', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incoming-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      setIncomingOpen(false);
      setEditingIncoming(null);
      setIncomingError('');
      setIncomingForm({
        productId: '',
        warehouseId: '',
        quantity: '1',
        expectedAt: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    },
    onError: (caught) => setIncomingError(extractApiMessage(caught, "Impossible d'enregistrer la commande.")),
  });

  const receiveIncomingMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/stock/incoming/${id}/receive`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incoming-stock'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (caught) => window.alert(extractApiMessage(caught, "Impossible de receptionner cette commande.")),
  });

  const deleteIncomingMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/stock/incoming/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['incoming-stock'] });
    },
    onError: (caught) => window.alert(extractApiMessage(caught, "Impossible de supprimer cette commande.")),
  });

  function handleIncomingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveIncomingMutation.mutate();
  }

  function openIncomingCreate() {
    setEditingIncoming(null);
    setIncomingError('');
    setIncomingForm({
      productId: '',
      warehouseId: '',
      quantity: '1',
      expectedAt: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setIncomingOpen(true);
  }

  function openIncomingEdit(entry: IncomingStockRecord) {
    setEditingIncoming(entry);
    setIncomingError('');
    setIncomingForm({
      productId: entry.product.id,
      warehouseId: entry.warehouse.id,
      quantity: String(entry.quantity),
      expectedAt: entry.expectedAt.slice(0, 10),
      notes: entry.notes ?? '',
    });
    setIncomingOpen(true);
  }

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Pilotage"
          title="Dashboard operations"
          description="Une vue d’ensemble premium pour suivre les interventions, le stock, les equipes et les alertes dans une meme interface de pilotage."
          actions={
            <div className="relative w-full max-w-[420px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une commande, un produit, un depot..."
                className="field pl-11"
              />
            </div>
          }
        />

        <div className="dashboard-kpi-row">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`dashboard-kpi-card bg-gradient-to-br ${stat.tone} text-white shadow-2xl shadow-blue-200/50`}
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-[1rem] bg-white/16 p-2.5">
                    <Icon size={18} />
                  </div>
                  <span className="rounded-full bg-white/14 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em]">
                    Live
                  </span>
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/76">{stat.label}</p>
                <p className="mt-2 text-2xl font-black leading-none">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)]">
          <Card className="glass-panel rounded-[2rem]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Approvisionnement</p>
                <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Produits commandes en attente d'arrivee</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  {filteredIncoming.length} ligne(s)
                </span>
                <button type="button" onClick={openIncomingCreate} className="btn-primary">
                  <Plus size={18} />
                  Nouvelle commande
                </button>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
              <div className="overflow-x-auto">
                <table className="dashboard-table min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50/90">
                    <tr>
                      <th className="px-5 py-4">Produit</th>
                      <th className="px-5 py-4">Categorie</th>
                      <th className="px-5 py-4">Quantite</th>
                      <th className="px-5 py-4">Depot</th>
                      <th className="px-5 py-4">Arrivee prevue</th>
                      <th className="px-5 py-4">Statut</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading || incoming.isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-sm text-slate-500">Chargement des commandes...</td>
                      </tr>
                    ) : isError || incoming.isError ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-sm text-red-600">Impossible de charger les commandes en attente.</td>
                      </tr>
                    ) : filteredIncoming.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-sm text-slate-500">Aucune commande en attente ne correspond a la recherche.</td>
                      </tr>
                    ) : (
                      filteredIncoming.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-900">{entry.product.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{entry.product.code}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{entry.product.category?.name || '-'}</td>
                          <td className="px-5 py-4 font-semibold text-slate-700">{entry.quantity}</td>
                          <td className="px-5 py-4 text-slate-600">{entry.warehouse.name}</td>
                          <td className="px-5 py-4 text-slate-600">{new Date(entry.expectedAt).toLocaleDateString('fr-FR')}</td>
                          <td className="px-5 py-4">
                            <span className={`status-pill ${entry.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {entry.status === 'RECEIVED' ? 'Arrive' : 'Commande'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              {entry.status === 'ORDERED' ? (
                                <>
                                  <button type="button" onClick={() => receiveIncomingMutation.mutate(entry.id)} className="btn-primary px-4 py-3">
                                    <CheckCheck size={16} />
                                  </button>
                                  <button type="button" onClick={() => openIncomingEdit(entry)} className="btn-secondary px-4 py-3">
                                    <Pencil size={16} />
                                  </button>
                                  <button type="button" onClick={() => deleteIncomingMutation.mutate(entry.id)} className="btn-danger px-4 py-3">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Recu</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="glass-panel rounded-[2rem]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Alertes</p>
                  <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Stock bas</h2>
                </div>
                <div className="rounded-[1rem] bg-blue-50 p-3 text-blue-700">
                  <Bell size={20} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {isError ? (
                  <p className="text-sm text-red-600">Les alertes de stock sont temporairement indisponibles.</p>
                ) : lowStock.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune alerte immediate sur les seuils de stock.</p>
                ) : (
                  lowStock.map((line) => (
                    <div key={line.id} className="rounded-[1.4rem] border border-amber-100 bg-amber-50/70 px-4 py-4">
                      <p className="font-black text-slate-900">{line.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Quantite totale : {(line.warehouseStocks ?? []).reduce((sum, entry) => sum + entry.quantity, 0)} · Seuil : {line.alertThreshold}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="glass-panel rounded-[2rem]">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Synthese</p>
              <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Distribution des statuts</h2>
              <div className="mt-5 space-y-3">
                {isError ? (
                  <p className="text-sm text-red-600">La synthese n’est pas disponible pour le moment.</p>
                ) : (
                  (data?.reports ?? []).map((entry) => (
                    <div key={entry.status} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{entry.status}</span>
                        <span className="text-2xl font-black text-slate-900">{entry._count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </AppShell>
      {incomingOpen ? (
        <Modal
          title={editingIncoming ? 'Modifier une commande fournisseur' : 'Creer une commande fournisseur'}
          subtitle="Cette table pilote les produits commandes qui ne sont pas encore entres en stock. Le bouton coche les receptionne."
          onClose={() => setIncomingOpen(false)}
        >
          <form onSubmit={handleIncomingSubmit} className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="field-label">Produit commande</label>
              <select className="field" value={incomingForm.productId} onChange={(event) => setIncomingForm({ ...incomingForm, productId: event.target.value })}>
                <option value="">Choisir</option>
                {(stock.data ?? []).map((line: StockDashboardLine) => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Depot d'arrivee</label>
              <select className="field" value={incomingForm.warehouseId} onChange={(event) => setIncomingForm({ ...incomingForm, warehouseId: event.target.value })}>
                <option value="">Choisir</option>
                {(warehouses.data ?? []).map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Quantite commandee</label>
              <input className="field" type="number" min="1" value={incomingForm.quantity} onChange={(event) => setIncomingForm({ ...incomingForm, quantity: event.target.value })} />
            </div>
            <div>
              <label className="field-label">Date d'arrivee prevue</label>
              <input className="field" type="date" value={incomingForm.expectedAt} onChange={(event) => setIncomingForm({ ...incomingForm, expectedAt: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Notes</label>
              <textarea className="field min-h-28" value={incomingForm.notes} onChange={(event) => setIncomingForm({ ...incomingForm, notes: event.target.value })} />
            </div>
            {incomingError ? (
              <div className="md:col-span-2 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {incomingError}
              </div>
            ) : null}
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setIncomingOpen(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">
                {saveIncomingMutation.isPending ? 'Enregistrement...' : editingIncoming ? 'Mettre a jour' : 'Creer la commande'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </ProtectedPage>
  );
}
