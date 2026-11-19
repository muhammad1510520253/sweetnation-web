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
  satuan: string | number;
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

/* ---------- cache baca: 30 detik ----------
 * Tiap request Apps Script ~2,5 detik, jadi data yang sama tidak diambil ulang
 * saat pindah halaman. Semua penulisan mengosongkan cache.
 */
const TTL = 30_000;
const readCache = new Map<string, { at: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export const clearApiCache = () => {
  readCache.clear();
};

const getCached = <T,>(
  sheet: string,
  params: Record<string, string | number | undefined> = {},
  ttl = TTL,
) => {
  const key = buildUrl(sheet, params);
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.data as T);

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const req = get<T>(sheet, params)
    .then((data) => {
      readCache.set(key, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, req);
  return req;
};

const post = <T,>(sheet: string, params: Record<string, string | number | undefined>, body: unknown) => {
  clearApiCache();
  return request<T>(buildUrl(sheet, params), {
    method: 'POST',
    // Apps Script membaca e.postData.contents; text/plain menghindari preflight CORS.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
};

export const api = {
  login: (email: string, password: string) =>
    get<User>('akun', { email: email.trim().toLowerCase(), password: password.trim() }),
  // Satu request untuk produk + konfigurasi (script optimized: sheet=bootstrap).
  bootstrap: (userId: string) =>
    getCached<{ produk: Product[]; konfigurasi: Configuration[] }>('bootstrap', { userId }, 120_000),
  products: (userId: string) => getCached<Product[]>('produk', { userId }, 120_000),
  configuration: (userId: string) => getCached<Configuration[]>('konfigurasi', { userId }, 120_000),
  transactions: (userId: string, date: string) =>
    getCached<Transaction[]>('transaksi', { transaksiDate: date, userId }),
  transactionItems: (userId: string, id: string) =>
    getCached<TransactionItem[]>('transaksi-item', { transaksiId: id, userId }),
  createTransaction: (userId: string, payload: unknown) =>
    post<unknown>('transaksi', { userId }, payload),
  updateTransactionStatus: (userId: string, id: string, value: string) =>
    post<unknown>('transaksi', { userId }, { id, value, isUpdate: true }),
  stocks: (userId: string) => getCached<Stock[]>('stok', { userId }),
  saveStock: (userId: string, payload: Record<string, unknown>) =>
    post<unknown>('stok', { userId }, payload),
  statistic: (userId: string) => getCached<Statistic[]>('summary', { userId }),
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
