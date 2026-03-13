'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api/client';
import { extractApiMessage } from '@/lib/api/error';
import { fetchUsers } from '@/lib/api/queries';
import { UserCategory, UserRecord, UserRole, UserStatus } from '@/types';

type UserFormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  category: UserCategory;
  status: UserStatus;
};

const emptyForm: UserFormState = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'TECHNICIAN',
  category: 'TECHNIQUE',
  status: 'ACTIVE',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users.data ?? []).filter((user) =>
      [user.firstName, user.lastName, user.email, user.role, user.status, user.phone ?? '']
        .concat(user.category)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [search, users.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.patch(`/users/${editing.id}`, {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          password: form.password || undefined,
          role: form.role,
          category: form.category,
          status: form.status,
        });
      }
      return api.post('/users', {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        role: form.role,
        category: form.category,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (caught) => setError(extractApiMessage(caught, 'Impossible d’enregistrer cet utilisateur.')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (caught) => window.alert(extractApiMessage(caught, 'Impossible de supprimer cet utilisateur.')),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function openEdit(user: UserRecord) {
    setEditing(user);
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      role: user.role,
      category: user.category,
      status: user.status,
    });
    setError('');
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Equipe"
          title="Utilisateurs, roles & categories"
          description="Administrez les comptes, les roles techniques/administratifs et les categories metier Gerant, Commercial, Technique."
          actions={
            <>
              <div className="relative min-w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="field pl-11"
                />
              </div>
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus size={18} />
                Nouvel utilisateur
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
                    <th className="px-5 py-4">Utilisateur</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Categorie</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Creation</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900">{user.firstName} {user.lastName}</div>
                        <div className="mt-1 text-xs text-slate-400">{user.email}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.phone || 'Non renseigne'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{user.role}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                          {user.category === 'GERANT' ? 'Gerant' : user.category === 'COMMERCIAL' ? 'Commercial' : 'Technique'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`status-pill ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEdit(user)} className="btn-secondary px-4 py-3">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => deleteMutation.mutate(user.id)} className="btn-danger px-4 py-3">
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
            title={editing ? 'Modifier un utilisateur' : 'Creer un utilisateur'}
            subtitle="Gardez une gouvernance claire des roles et des categories metier. Le compte direction@sacoges.com peut etre gere ici."
            onClose={() => setOpen(false)}
          >
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">Email</label>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  readOnly={Boolean(editing)}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">{editing ? 'Nouveau mot de passe' : 'Mot de passe'}</label>
                <input className="field" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                {editing ? (
                  <p className="mt-2 text-xs text-slate-500">Laissez vide si vous ne voulez pas changer le mot de passe.</p>
                ) : null}
              </div>
              <div>
                <label className="field-label">Prenom</label>
                <input className="field" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Nom</label>
                <input className="field" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Telephone</label>
                <input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select className="field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                </select>
              </div>
              <div>
                <label className="field-label">Categorie</label>
                <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as UserCategory })}>
                  <option value="GERANT">Gerant</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="TECHNIQUE">Technique</option>
                </select>
              </div>
              {editing ? (
                <div>
                  <label className="field-label">Statut</label>
                  <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              ) : null}
              {error ? (
                <div className="md:col-span-2 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">
                  {saveMutation.isPending ? 'Enregistrement...' : editing ? 'Mettre a jour' : 'Creer l’utilisateur'}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
