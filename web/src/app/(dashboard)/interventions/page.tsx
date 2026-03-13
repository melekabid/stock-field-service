'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { SignaturePad, SignaturePadHandle } from '@/components/ui/signature-pad';
import { api } from '@/lib/api/client';
import { extractApiMessage } from '@/lib/api/error';
import { fetchInterventionDetail, fetchInterventions } from '@/lib/api/queries';
import { Intervention } from '@/types';

type InterventionFormState = {
  clientName: string;
  technicianName: string;
  interventionDescription: string;
  workedHours: string;
  machineType: string;
  warrantyEnabled: boolean;
};

const emptyForm: InterventionFormState = {
  clientName: '',
  technicianName: '',
  interventionDescription: '',
  workedHours: '',
  machineType: '',
  warrantyEnabled: false,
};

export default function InterventionsPage() {
  const queryClient = useQueryClient();
  const interventions = useQuery({ queryKey: ['interventions'], queryFn: fetchInterventions });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Intervention | null>(null);
  const [open, setOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<InterventionFormState>(emptyForm);
  const [existingClientSignature, setExistingClientSignature] = useState('');
  const [existingTechnicianSignature, setExistingTechnicianSignature] = useState('');
  const clientSignatureRef = useRef<SignaturePadHandle>(null);
  const technicianSignatureRef = useRef<SignaturePadHandle>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (interventions.data ?? []).filter((entry) =>
      [
        entry.number,
        entry.description,
        entry.status,
        entry.client?.name ?? '',
        entry.site?.name ?? '',
        entry.site?.address ?? '',
        extractNoteValue(entry.notes, 'Client'),
        extractNoteValue(entry.notes, 'Intervenant'),
        extractNoteValue(entry.notes, "Type de machine"),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [interventions.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        clientName: form.clientName.trim(),
        technicianName: form.technicianName.trim(),
        interventionDescription: form.interventionDescription.trim(),
        workedHours: form.workedHours.trim(),
        warrantyEnabled: form.warrantyEnabled,
        machineType: form.machineType.trim(),
      };

      if (editing) {
        return api.patch(`/interventions/${editing.id}`, {
          ...payload,
          signerName: form.clientName.trim(),
          signatureUrl: clientSignatureRef.current?.toDataUrl() || undefined,
          technicianSignatureUrl: technicianSignatureRef.current?.toDataUrl() || undefined,
        });
      }

      return api.post('/interventions', {
        ...payload,
        date: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['interventions'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setExistingClientSignature('');
      setExistingTechnicianSignature('');
      setError('');
    },
    onError: (caught) => setError(extractApiMessage(caught, 'Impossible d’enregistrer l’intervention.')),
  });

  const pdfMutation = useMutation({
    mutationFn: async (id: string) => (await api.post<{ pdfUrl: string }>(`/reports/interventions/${id}/pdf`)).data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/interventions/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['interventions'] });
    },
    onError: (caught) => window.alert(extractApiMessage(caught, 'Impossible de supprimer cette intervention.')),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setExistingClientSignature('');
    setExistingTechnicianSignature('');
    setError('');
    setOpen(true);
  }

  async function openEdit(intervention: Intervention) {
    setLoadingEdit(true);
    setError('');
    try {
      const detail = await fetchInterventionDetail(intervention.id);
      setEditing(intervention);
      setForm({
        clientName: extractNoteValue(detail.notes, 'Client') || detail.client?.name || '',
        technicianName:
          extractNoteValue(detail.notes, 'Intervenant') ||
          (detail.technician ? `${detail.technician.firstName} ${detail.technician.lastName}` : ''),
        interventionDescription: extractNoteValue(detail.notes, 'Description') || detail.description || '',
        workedHours: extractNoteValue(detail.notes, "Nombre d'heure") || '',
        machineType: extractNoteValue(detail.notes, 'Type de machine') || detail.site?.name || '',
        warrantyEnabled: extractWarranty(detail.notes),
      });
      setExistingClientSignature(detail.signature?.url || '');
      setExistingTechnicianSignature(
        detail.photos?.find((photo) => photo.caption === 'Technician signature')?.url || '',
      );
      setOpen(true);
    } catch (caught) {
      window.alert(extractApiMessage(caught, "Impossible de charger le detail de l’intervention."));
    } finally {
      setLoadingEdit(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  async function handleGeneratePdf(id: string) {
    const pdfWindow = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const result = await pdfMutation.mutateAsync(id);
      const backendBase = String(api.defaults.baseURL ?? '').replace(/\/api$/, '');
      const pdfUrl = `${backendBase}${result.pdfUrl}`;

      if (pdfWindow) {
        pdfWindow.location.href = pdfUrl;
        return;
      }

      window.location.assign(pdfUrl);
    } catch (caught) {
      if (pdfWindow) {
        pdfWindow.close();
      }
      window.alert(extractApiMessage(caught, "Impossible de generer le PDF de l’intervention."));
    }
  }

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Terrain"
          title="Interventions"
          description="Le formulaire web reprend maintenant exactement les champs du mobile. A l’ajout, pas de signature. En modification, les deux signatures sont disponibles."
          actions={
            <>
              <div className="relative min-w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un ticket, un client, un intervenant..."
                  className="field pl-11"
                />
              </div>
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus size={18} />
                Nouvelle intervention
              </button>
            </>
          }
        />

        <Card className="glass-panel rounded-[2rem]">
          <div className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <table className="dashboard-table min-w-full text-left text-sm">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-5 py-4">Ticket</th>
                    <th className="px-5 py-4">Client</th>
                    <th className="px-5 py-4">Intervenant</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Machine</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-5 py-4 font-black text-slate-900">{entry.number}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {extractNoteValue(entry.notes, 'Client') || entry.client?.name || '-'}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {extractNoteValue(entry.notes, 'Intervenant') ||
                          (entry.technician ? `${entry.technician.firstName} ${entry.technician.lastName}` : '-')}
                      </td>
                      <td className="px-5 py-4 max-w-xl text-slate-600">
                        {extractNoteValue(entry.notes, 'Description') || entry.description}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {extractNoteValue(entry.notes, 'Type de machine') || entry.site?.name || '-'}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{new Date(entry.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-5 py-4">
                        <span className="status-pill bg-blue-50 text-blue-700">{entry.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleGeneratePdf(entry.id)}
                            className="btn-secondary px-4 py-3"
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(entry)}
                            disabled={loadingEdit}
                            className="btn-secondary px-4 py-3"
                          >
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => deleteMutation.mutate(entry.id)} className="btn-danger px-4 py-3">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {open ? (
          <Modal
            title={editing ? 'Modifier une intervention' : 'Creer une intervention'}
            subtitle={
              editing
                ? 'Le formulaire reprend la fiche mobile, avec signatures client et intervenant en modification.'
                : 'A l’ajout, vous saisissez les champs exacts du mobile sans signatures.'
            }
            onClose={() => setOpen(false)}
          >
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">Nom et prenom client</label>
                <input className="field" value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Nom et prenom intervenant</label>
                <input className="field" value={form.technicianName} onChange={(event) => setForm({ ...form, technicianName: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Description de l’intervention</label>
                <textarea className="field min-h-32" value={form.interventionDescription} onChange={(event) => setForm({ ...form, interventionDescription: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Nombre d’heure</label>
                <input className="field" inputMode="numeric" pattern="[0-9]*" value={form.workedHours} onChange={(event) => setForm({ ...form, workedHours: event.target.value.replace(/\D/g, '') })} />
              </div>
              <div>
                <label className="field-label">Type de machine</label>
                <input className="field" value={form.machineType} onChange={(event) => setForm({ ...form, machineType: event.target.value })} />
              </div>
              <div className="md:col-span-2 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Garantie</p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, warrantyEnabled: true })}
                    className={form.warrantyEnabled ? 'btn-primary' : 'btn-secondary'}
                  >
                    Sous garantie
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, warrantyEnabled: false })}
                    className={!form.warrantyEnabled ? 'btn-primary' : 'btn-secondary'}
                  >
                    Non garantie
                  </button>
                </div>
              </div>

              {editing ? (
                <>
                  <div className="md:col-span-2">
                    <SignaturePad ref={clientSignatureRef} label="Signature client" initialDataUrl={existingClientSignature} />
                  </div>
                  <div className="md:col-span-2">
                    <SignaturePad
                      ref={technicianSignatureRef}
                      label="Signature intervenant"
                      initialDataUrl={existingTechnicianSignature}
                    />
                  </div>
                </>
              ) : null}

              {error ? (
                <div className="md:col-span-2 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">
                  {saveMutation.isPending ? 'Enregistrement...' : editing ? 'Mettre a jour' : 'Creer l’intervention'}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}

function extractNoteValue(notes: string | undefined, label: string) {
  if (!notes) {
    return '';
  }

  const line = notes.split('\n').find((entry) => entry.startsWith(`${label}:`));
  return line ? line.replace(`${label}:`, '').trim() : '';
}

function extractWarranty(notes: string | undefined) {
  return extractNoteValue(notes, 'Garantie').toLowerCase().includes('sous garantie');
}
