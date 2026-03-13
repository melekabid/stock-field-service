'use client';

import { api } from './client';
import {
  Category,
  Client,
  IncomingStockRecord,
  Intervention,
  Product,
  Site,
  StockDashboardLine,
  StockScanResult,
  StockReportEntry,
  Supplier,
  UserRecord,
  Warehouse,
} from '@/types';

export const fetchDashboard = async () => {
  const [stock, interventions, reports, notifications, users, products] = await Promise.all([
    api.get<StockDashboardLine[]>('/stock'),
    api.get<Intervention[]>('/interventions'),
    api.get<StockReportEntry[]>('/reports/summary'),
    api.get('/notifications/me'),
    api.get<UserRecord[]>('/users'),
    api.get<Product[]>('/products'),
  ]);

  return {
    stock: stock.data,
    interventions: interventions.data,
    reports: reports.data,
    notifications: notifications.data,
    users: users.data,
    products: products.data,
  };
};

export const loginRequest = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const fetchProducts = async () => (await api.get<Product[]>('/products')).data;
export const fetchUsers = async () => (await api.get<UserRecord[]>('/users')).data;
export const fetchInterventions = async () => (await api.get<Intervention[]>('/interventions')).data;
export const fetchInterventionDetail = async (id: string) => (await api.get<Intervention>(`/interventions/${id}`)).data;
export const fetchStock = async () => (await api.get<StockDashboardLine[]>('/stock')).data;
export const fetchIncomingStock = async () => (await api.get<IncomingStockRecord[]>('/stock/incoming')).data;
export const fetchReports = async () => (await api.get<StockReportEntry[]>('/reports/summary')).data;
export const fetchCategories = async () => (await api.get<Category[]>('/categories')).data;
export const fetchSuppliers = async () => (await api.get<Supplier[]>('/suppliers')).data;
export const fetchWarehouses = async () => (await api.get<Warehouse[]>('/warehouses')).data;
export const fetchClients = async () => (await api.get<Client[]>('/clients')).data;
export const fetchSites = async () => (await api.get<Site[]>('/sites')).data;
export const scanStockBarcode = async (payload: { barcode: string; quantity?: number; warehouseCode?: string }) =>
  (await api.post<StockScanResult>('/stock/scan-barcode', payload)).data;
