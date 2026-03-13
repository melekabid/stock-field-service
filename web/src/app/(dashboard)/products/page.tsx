'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { ProtectedPage } from '@/components/layout/protected-page';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api/client';
import { extractApiMessage } from '@/lib/api/error';
import { fetchCategories, fetchProducts, fetchSuppliers } from '@/lib/api/queries';
import { Category, Product } from '@/types';

type ProductFormState = {
  code: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  supplierId: string;
  unitPrice: string;
  alertThreshold: string;
  kind: 'MACHINE' | 'CONSUMABLE';
};

type CategoryFormState = {
  name: string;
  description: string;
};

const emptyProduct: ProductFormState = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  supplierId: '',
  unitPrice: '0',
  alertThreshold: '0',
  kind: 'CONSUMABLE',
};

const emptyCategory: CategoryFormState = {
  name: '',
  description: '',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [productError, setProductError] = useState('');
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProduct);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategory);

  const products = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const categories = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (products.data ?? []).filter((product) =>
      [
        product.code,
        product.barcode ?? '',
        product.name,
        product.description ?? '',
        product.kind,
        product.category?.name ?? '',
        product.supplier?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [products.data, search]);

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: productForm.code.trim(),
        barcode: productForm.barcode.trim(),
        name: productForm.name.trim(),
        description: productForm.description.trim() || undefined,
        categoryId: productForm.categoryId,
        supplierId: productForm.supplierId,
        unitPrice: Number(productForm.unitPrice),
        alertThreshold: Number(productForm.alertThreshold),
        kind: productForm.kind,
      };

      if (editingProduct) {
        return api.patch(`/products/${editingProduct.id}`, payload);
      }

      return api.post('/products', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProduct);
      setProductError('');
    },
    onError: (caught) => setProductError(extractApiMessage(caught, 'Impossible d’enregistrer le produit.')),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (caught) => window.alert(extractApiMessage(caught, 'Impossible de supprimer ce produit.')),
  });

  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      };

      if (editingCategory) {
        return api.patch(`/categories/${editingCategory.id}`, payload);
      }

      return api.post('/categories', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryForm(emptyCategory);
      setEditingCategory(null);
      setCategoryError('');
    },
    onError: (caught) => setCategoryError(extractApiMessage(caught, 'Impossible d’enregistrer la categorie.')),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (editingCategory?.id) {
        setEditingCategory(null);
        setCategoryForm(emptyCategory);
      }
    },
    onError: (caught) => setCategoryError(extractApiMessage(caught, 'Impossible de supprimer cette categorie.')),
  });

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductError('');
    setProductOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({
      code: product.code,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category?.id ?? '',
      supplierId: product.supplier?.id ?? '',
      unitPrice: String(product.unitPrice),
      alertThreshold: String(product.alertThreshold),
      kind: product.kind,
    });
    setProductError('');
    setProductOpen(true);
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveProductMutation.mutate();
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCategoryMutation.mutate();
  }

  return (
    <ProtectedPage>
      <AppShell>
        <PageHeader
          eyebrow="Catalogue"
          title="Produits, types et categories"
          description="Gerez les produits, leurs types machine/consommable, les categories, le code-barres texte et les seuils de stock dans une seule interface."
          actions={
            <>
              <div className="relative min-w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un produit, code, categorie..."
                  className="field pl-11"
                />
              </div>
              <button type="button" onClick={() => setCategoriesOpen(true)} className="btn-secondary">
                <FolderTree size={18} />
                Gerer categories
              </button>
              <button type="button" onClick={openCreateProduct} className="btn-primary">
                <Plus size={18} />
                Nouveau produit
              </button>
            </>
          }
        />

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Machines</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {(products.data ?? []).filter((product) => product.kind === 'MACHINE').length}
            </p>
            <p className="mt-3 text-sm text-slate-500">Le type est modifiable directement dans chaque fiche produit.</p>
          </Card>
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Consommables</p>
            <p className="mt-3 text-4xl font-black text-slate-900">
              {(products.data ?? []).filter((product) => product.kind === 'CONSUMABLE').length}
            </p>
            <p className="mt-3 text-sm text-slate-500">Le code-barres texte saisi ici sera exploite ensuite par le scan camera.</p>
          </Card>
          <Card className="glass-panel rounded-[2rem]">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-blue-600">Categories</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{categories.data?.length ?? 0}</p>
            <p className="mt-3 text-sm text-slate-500">Creation, modification et suppression depuis le bouton Gerer categories.</p>
          </Card>
        </div>

        <Card className="glass-panel rounded-[2rem]">
          <div className="overflow-hidden rounded-[1.8rem] border border-slate-100 bg-white">
            <div className="overflow-x-auto">
              <table className="dashboard-table min-w-full text-left text-sm">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Produit</th>
                    <th className="px-5 py-4">Categorie</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Code-barres</th>
                    <th className="px-5 py-4">Seuil</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id}>
                      <td className="px-5 py-4 font-bold text-slate-900">{product.code}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        <div className="mt-1 max-w-md text-xs leading-6 text-slate-500">{product.description || 'Sans description'}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{product.category?.name || '-'}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
                          {product.kind === 'MACHINE' ? 'Machine' : 'Consommable'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{product.barcode || 'Non renseigne'}</td>
                      <td className="px-5 py-4 text-slate-600">{product.alertThreshold}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {(product.warehouseStocks ?? []).reduce((sum, line) => sum + line.quantity, 0)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditProduct(product)} className="btn-secondary px-4 py-3">
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            className="btn-danger px-4 py-3"
                          >
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

        {productOpen ? (
          <Modal
            title={editingProduct ? 'Modifier le produit' : 'Creer un produit'}
            subtitle="Le type, la categorie et le code-barres texte sont geres ici pour preparer le scan camera."
            onClose={() => setProductOpen(false)}
          >
            <form onSubmit={handleProductSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">Reference produit</label>
                <input className="field" value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Code-barres texte</label>
                <input className="field" value={productForm.barcode} onChange={(event) => setProductForm({ ...productForm, barcode: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Nom produit</label>
                <input className="field" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="field-label">Description</label>
                <textarea className="field min-h-28" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Categorie</label>
                <select className="field" value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}>
                  <option value="">Choisir</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Type</label>
                <select className="field" value={productForm.kind} onChange={(event) => setProductForm({ ...productForm, kind: event.target.value as ProductFormState['kind'] })}>
                  <option value="MACHINE">Machine</option>
                  <option value="CONSUMABLE">Consommable</option>
                </select>
              </div>
              <div>
                <label className="field-label">Fournisseur</label>
                <select className="field" value={productForm.supplierId} onChange={(event) => setProductForm({ ...productForm, supplierId: event.target.value })}>
                  <option value="">Choisir</option>
                  {(suppliers.data ?? []).map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Seuil alerte</label>
                <input className="field" type="number" min="0" value={productForm.alertThreshold} onChange={(event) => setProductForm({ ...productForm, alertThreshold: event.target.value })} />
              </div>
              <div>
                <label className="field-label">Prix unitaire</label>
                <input className="field" type="number" min="0" step="0.01" value={productForm.unitPrice} onChange={(event) => setProductForm({ ...productForm, unitPrice: event.target.value })} />
              </div>
              {productError ? (
                <div className="md:col-span-2 rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {productError}
                </div>
              ) : null}
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setProductOpen(false)} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">
                  {saveProductMutation.isPending ? 'Enregistrement...' : editingProduct ? 'Mettre a jour' : 'Creer le produit'}
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        {categoriesOpen ? (
          <Modal
            title="Gerer les categories"
            subtitle="Creer, modifier ou supprimer les categories utilisees par les produits et consommables."
            onClose={() => setCategoriesOpen(false)}
          >
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="field-label">Nom categorie</label>
                  <input className="field" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <textarea className="field min-h-28" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
                </div>
                {categoryError ? (
                  <div className="rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {categoryError}
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary">
                    {saveCategoryMutation.isPending ? 'Enregistrement...' : editingCategory ? 'Mettre a jour' : 'Creer la categorie'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm(emptyCategory);
                      setCategoryError('');
                    }}
                  >
                    Reinitialiser
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {(categories.data ?? []).map((category) => (
                  <div key={category.id} className="rounded-[1.4rem] border border-slate-100 bg-slate-50/80 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900">{category.name}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{category.description || 'Sans description'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-4 py-3"
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryForm({
                              name: category.name,
                              description: category.description ?? '',
                            });
                            setCategoryError('');
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-4 py-3"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
