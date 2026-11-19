# Sweetnation Web

Versi web dari aplikasi Flutter **Sweetnation** — kasir & manajemen pesanan homemade food.
Dibangun ulang dengan React + TypeScript + Vite, responsive untuk HP maupun desktop.

## Fitur

- **Login** — autentikasi ke Google Apps Script (sheet `akun`)
- **Beranda** — ringkasan pesanan (Antrian / Proses / Siap / Selesai), pemasukan per metode bayar, daftar menu
- **Menu** — semua produk + pencarian, tap untuk langsung membuat pesanan
- **Transaksi** — daftar per tanggal, filter status, tambah transaksi, detail + struk siap cetak
- **Stok** — daftar bahan, filter status (Habis / Sedikit / Banyak), tambah & ubah stok
- **Akun** — profil, refresh cache, test printer, statistik penjualan (grafik + tabel), logout

## Stack

- React + TypeScript
- Vite
- react-router-dom
- lucide-react (ikon)
- CSS murni (tanpa framework UI) — tema pink `#F395BE`, font Chivo

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output ke dist/
```

## Deploy

Build statis. `vercel.json` sudah berisi rewrite SPA agar route seperti `/transactions` tidak 404.

```bash
vercel --prod        # atau drag & drop folder dist/ ke Netlify/Vercel
```

## Struktur

```
src/
  api.ts        # wrapper REST Apps Script (GET/POST) + helper rupiah & tanggal
  auth.tsx      # konteks login/logout (localStorage)
  store.tsx     # cache produk & konfigurasi
  ui.tsx        # toast, modal, spinner, empty state
  App.tsx       # router + shell (sidebar desktop / bottom nav mobile)
  pages/        # Login, Home, Menu, Transactions, TransactionForm, TransactionDetail, Stock, Profile, Statistic
```

## Catatan data

Semua data diambil langsung dari Apps Script yang dipakai aplikasi Flutter:
`.../exec?sheet=produk|akun|transaksi|transaksi-item|stok|konfigurasi|summary`.
Write memakai POST JSON (`isUpdate` / `isDelete` sesuai kontrak aplikasi asli).
