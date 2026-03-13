'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Plus, Search, ScanLine } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { BarcodeScanner } from '@/components/ui/barcode-scanner';
import { api } from '@/lib/api/client';
import { extractApiMessage } from '@/lib/api/error';
import { fetchStock, fetchWarehouses, scanStockBarcode } from '@/lib/api/queries';
import { StockDashboardLine, StockMovementType, StockScanResult } from '@/types';

type MovementForm = {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: string;
  reference: string;
  notes: string;
};

type ScanForm = {
  barcode: string;
  warehouseCode: string;
  quantity: string;
};

const emptyMovement: MovementForm = {
  productId: '',
  warehouseId: '',
  type: 'IN',
  quantity: '1',
  reference: '',
  notes: '',
};

const emptyScan: ScanForm = {
  barcode: '',
  warehouseCode: 'MAIN',
  quantity: '1',
};

export default function StockPage() {
  const queryClient = useQueryClient();
  const stock = useQuery({ queryKey: ['stock'], queryFn: fetchStock });
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: fetchWarehouses });
  const [search, setSearch] = useState('');
  const [movementOpen, setMovementOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [movementError, setMovementError] = useState('');
  const [scanError, setScanError] = useState('');
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovement);
  const [scanForm, setScanForm] = useState<ScanForm>(emptyScan);
  const [scanResult, setScanResult] = useState<StockScanResult | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (stock.data ?? []).filter((line: StockDashboardLine) =>
      [
        line.name,
        line.code,
        line.description ?? '',
        line.kind,
        line.category?.name ?? '',
        ...line.warehouseStocks.map((entry) => `${entry.warehouse.name} ${entry.quantity}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [search, stock.data]);

  const moveMutation = useMutation({
    mutationFn: async () =>
      api.post('/stock/movements', {
        productId: movementForm.productId,
        warehouseId: movementForm.warehouseId,
        type: movementForm.type,
        quantity: Number(movementForm.quantity),
        reference: movementForm.reference || undefined,
        notes: movementForm.notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      setMovementOpen(false);
      setMovementForm(emptyMovement);
      setMovementError('');
    },
    onError: (caught) => setMovementError(extractApiMessage(caught, 'Impossible d’enregistrer ce mouvement de stock.')),
  });

  const scanMutation = useMutation({
    mutationFn: async () =>
      scanStockBarcode({
        barcode: scanForm.barcode.trim(),
        warehouseCode: scanForm.warehouseCode.trim() || undefined,
        quantity: Number(scanForm.quantity || '1'),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      setScanResult(result);
      setScanError('');
    },
    onError: (caught) => {
      setScanResult(null);
      setScanError(extractApiMessage(caught, 'Impossible de retirer ce produit du stock.'));
    },
  });

  function handleMovementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    moveMutation.mutate();
  }

  function handleScanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    scanMutation.mutate();
  }

  function handleDetectedBarcode(code: string) {
    setScanForm((current) => ({ ...current, barcode: code }));
  }

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Magasin"
          title="Gestion de stock"
          description="Le code-barres est d’abord saisi comme texte sur les produits, puis utilise ici en saisie manuelle ou en scan camera pour retirer automatiquement du stock."
          actions={
            <>
              <div className="relative min-w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un article, une categorie, un depot..."
                  className="field pl-11"
                />
              </div>
              <button type="button" onClick={() => setScanOpen(true)} className="btn-secondary">
                <Camera size={18} />
                Scan code-barres
              </button>
              <button type="button" onClick={() => setMovementOpen(true)} className="btn-primary">
                <Plus size={18} />
                Nouveau mouvement
              </button>
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Lignes stock</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{stock.data?.length ?? 0}</p>
          </Card>
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Quantite totale</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {(stock.data ?? []).reduce((sum, line) => sum + line.warehouseStocks.reduce((q, row) => q + row.quantity, 0), 0)}
            </p>
          </Card>
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-600">Alertes seuil</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {(stock.data ?? []).filter((line) => line.warehouseStocks.reduce((sum, row) => sum + row.quantity, 0) <= line.alertThreshold).length}
            </p>
          </Card>
        </div>

        <Card className="glass-panel rounded-[2rem]">
          <div className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <table className="dashboard-table min-w-full text-left text-sm">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-5 py-4">Produit</th>
                    <th className="px-5 py-4">Categorie</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Code-barres texte</th>
                    <th className="px-5 py-4">Seuil</th>
                    <th className="px-5 py-4">Depots</th>
                    <th className="px-5 py-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((line) => (
                    <tr key={line.id}>
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">{line.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{line.code}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{line.category?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                          {line.kind === 'MACHINE' ? 'Machine' : 'Consommable'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{line.barcode ?? 'Voir fiche produit'}</td>
                      <td className="px-5 py-4 text-slate-600">{line.alertThreshold}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="space-y-1">
                          {line.warehouseStocks.map((entry) => (
                            <div key={entry.warehouse.id}>
                              {entry.warehouse.name}: {entry.quantity}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-900">
                        {line.warehouseStocks.reduce((sum, row) => sum + row.quantity, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {movementOpen ? (
          <Modal
            title="Enregistrer un mouvement"
            subtitle="Ajoutez une entree, une sortie ou un ajustement pour maintenir le stock a jour."
            onClose={() => setMovementOpen(false)}
          >
            <form onSubmit={handleMovementSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">Produit</label>
                <select className="field" value={movementForm.productId} onChange={(event) => setMovementForm({ ...movementForm, productId: event.target.value })}>
                  <option value="">Choisir</option>
                  {(stock.data ?? []).map((line) => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Depot</label>
                <select className="field" value={movementForm.warehouseId} onChange={(event) => setMovementForm({ ...movementForm, warehouseId: event.target.value })}>
                  <option value="">Choisir</option>
                  {(warehouses.data ?? []).map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Type</label>
                <select className="field" value={movementForm.type} onChange={(event) => setMovementForm({ ...movementForm, type: event.target.value as StockMovementType })}>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
              </div>
              <div>
                <label className="field-label">Quantite</label>
                <input className="field" type="number" min="1" value={movementForm.quantity} onChange={(event) => setMovementForm({ ...movementForm, quantity: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Reference</label>
                <input className="field" value={movementForm.reference} onChange={(event) => setMovementForm({ ...movementForm, reference: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Notes</label>
                <textarea className="field min-h-28" value={movementForm.notes} onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} />
              </div>
              {movementError ? (
                <div className="md:col-span-2 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {movementError}
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setMovementOpen(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">
                  {moveMutation.isPending ? 'Enregistrement...' : 'Valider le mouvement'}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {scanOpen ? (
          <Modal
            title="Scanner un code-barres"
            subtitle="Le code-barres texte saisi sur la fiche produit est reconnu ici. Au scan, le stock est diminue de 1 par defaut et le nom du preneur est trace."
            onClose={() => {
              setScanOpen(false);
              setScanResult(null);
              setScanError('');
              setScanForm(emptyScan);
            }}
          >
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <BarcodeScanner onDetected={handleDetectedBarcode} />

              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-[1rem] bg-blue-50 p-3 text-blue-700">
                      <ScanLine size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Saisie manuelle</p>
                      <p className="mt-1 text-sm text-slate-500">Tu peux saisir le code-barres texte ou laisser la camera le remplir.</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="field-label">Code-barres</label>
                      <input className="field" value={scanForm.barcode} onChange={(event) => setScanForm({ ...scanForm, barcode: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label">Code depot</label>
                      <input className="field" value={scanForm.warehouseCode} onChange={(event) => setScanForm({ ...scanForm, warehouseCode: event.target.value.toUpperCase() })} />
                    </div>
                    <div>
                      <label className="field-label">Quantite retiree</label>
                      <input className="field" type="number" min="1" value={scanForm.quantity} onChange={(event) => setScanForm({ ...scanForm, quantity: event.target.value })} />
                    </div>
                  </div>
                </div>

                {scanError ? (
                  <div className="rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {scanError}
                  </div>
                ) : null}

                {scanResult ? (
                  <div className="rounded-[1.6rem] border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-sm font-black text-emerald-700">{scanResult.message}</p>
                    <p className="mt-2 text-sm text-slate-700">Produit : {scanResult.product.name}</p>
                    <p className="mt-1 text-sm text-slate-700">Pris par : {scanResult.takenBy}</p>
                    <p className="mt-1 text-sm text-slate-700">Quantite retiree : {scanResult.quantityTaken}</p>
                    <p className="mt-1 text-sm text-slate-700">Reste en stock : {scanResult.remainingQuantity}</p>
                  </div>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setScanOpen(false)} className="btn-secondary">Fermer</button>
                  <button type="submit" className="btn-primary">
                    {scanMutation.isPending ? 'Scan en cours...' : 'Valider le scan'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
