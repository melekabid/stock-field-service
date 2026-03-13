export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type UserCategory = 'GERANT' | 'COMMERCIAL' | 'TECHNIQUE';
export type InterventionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type ProductKind = 'MACHINE' | 'CONSUMABLE';
export type IncomingStockStatus = 'ORDERED' | 'RECEIVED';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  clientId: string;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  unitPrice: number;
  alertThreshold: number;
  kind: ProductKind;
  categoryId?: string;
  supplierId?: string;
  category?: Category;
  supplier?: Supplier;
  warehouseStocks: Array<{ quantity: number; warehouse: Warehouse }>;
}

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  category: UserCategory;
  status: UserStatus;
  createdAt?: string;
}

export interface Intervention {
  id: string;
  number: string;
  status: InterventionStatus;
  date: string;
  description: string;
  notes?: string;
  client: { id?: string; name: string };
  site: { id?: string; name: string; address: string };
  technician: { id?: string; firstName: string; lastName: string };
  signature?: { url?: string; signerName?: string };
  photos?: Array<{ id?: string; url: string; caption?: string }>;
}

export interface StockDashboardLine {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  alertThreshold: number;
  kind: ProductKind;
  category?: Category;
  warehouseStocks: Array<{ id?: string; quantity: number; warehouse: Warehouse }>;
}

export interface StockReportEntry {
  status: string;
  _count: number;
}

export interface StockScanResult {
  message: string;
  takenBy: string;
  quantityTaken: number;
  remainingQuantity: number;
  product: {
    id: string;
    name: string;
    reference: string;
    barcode: string;
    category: string;
    kind: ProductKind;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

export interface IncomingStockRecord {
  id: string;
  quantity: number;
  expectedAt: string;
  status: IncomingStockStatus;
  notes?: string;
  receivedAt?: string;
  product: Product;
  warehouse: Warehouse;
}
