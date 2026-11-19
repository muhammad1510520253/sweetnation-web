const BASE =
  'https://script.google.com/macros/s/AKfycbxSiwiRIa7eoNgZDAc4JlAos4PB_R595FO7ellnJxXrEPk5XG85niQeNsO9HSF4LKuq/exec';

export type Product = {
  id: string;
  nama: string;
  harga: number;
  status: number;
  image: string;
};

export type Transaction = {
  transaksi_id: string;
  nama_pembeli: string;
  keterangan: string;
  metode_pembayaran: string;
  metode_pengiriman: string;
  alamat: string;
  sub_total: number;
  diskon: number;
  total: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
};

export type TransactionItem = {
  transaksi_id?: string;
  produk: string;
  jumlah: number;
  harga: number;
  diskon: number;
};

export type Stock = {
  stok_id: string;
  nama: string;
  harga: number;
  satuan: string;
  harga_satuan: number;
  status: string;
};

export type Configuration = { nama: string; diskon: number };
export type Statistic = { tanggal: string; jumlah: number; total: number };
export type User = {
  user_id: string;
  nama: string;
  email: string;
  hak_akses: number;
  status: number;
};

export class ApiError extends Error {}

const buildUrl = (sheet: string, params: Record<string, string | number | undefined> = {}) => {
  const qs = new URLSearchParams({ sheet });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  return `${BASE}?${qs.toString()}`;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('Tidak ada koneksi internet');
  }
  const raw = await res.text();
  let json: { success?: boolean; message?: string; data?: T };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError('Respons server tidak valid');
  }
  if (!json.success) throw new ApiError(json.message || 'Terjadi kesalahan');
  return json.data as T;
}

const get = <T,>(sheet: string, params: Record<string, string | number | undefined> = {}) =>
  request<T>(buildUrl(sheet, params));

const post = <T,>(sheet: string, params: Record<string, string | number | undefined>, body: unknown) =>
  request<T>(buildUrl(sheet, params), {
    method: 'POST',
    // Apps Script membaca e.postData.contents; text/plain menghindari preflight CORS.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });

export const api = {
  login: (email: string, password: string) =>
    get<User>('akun', { email: email.trim().toLowerCase(), password: password.trim() }),
  products: (userId: string) => get<Product[]>('produk', { userId }),
  configuration: (userId: string) => get<Configuration[]>('konfigurasi', { userId }),
  transactions: (userId: string, date: string) =>
    get<Transaction[]>('transaksi', { transaksiDate: date, userId }),
  transactionItems: (userId: string, id: string) =>
    get<TransactionItem[]>('transaksi-item', { transaksiId: id, userId }),
  createTransaction: (userId: string, payload: unknown) =>
    post<unknown>('transaksi', { userId }, payload),
  updateTransactionStatus: (userId: string, id: string, value: string) =>
    post<unknown>('transaksi', { userId }, { id, value, isUpdate: true }),
  stocks: (userId: string) => get<Stock[]>('stok', { userId }),
  saveStock: (userId: string, payload: Record<string, unknown>) =>
    post<unknown>('stok', { userId }, payload),
  statistic: (userId: string) => get<Statistic[]>('summary', { userId }),
};

export const rupiah = (value?: number | null, withPrefix = true) => {
  const n = Number(value ?? 0);
  const s = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
  return withPrefix ? `Rp ${s}` : s;
};

export const ddMMyyyy = (date: Date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}-${m}-${date.getFullYear()}`;
};

export const ymd = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

export const hhmmss = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
