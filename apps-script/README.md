# Apps Script backend

Sumber data Sweetnation. Dua versi:

| File | Keterangan |
| --- | --- |
| `Code.gs` | Versi asli (baseline), disimpan apa adanya sebagai referensi |
| `Code.optimized.gs` | Versi produksi: caching + request gabungan + lock saat menulis |

## Deploy

1. Buka spreadsheet → **Extensions → Apps Script**
2. Ganti isi `Code.gs` dengan `apps-script/Code.optimized.gs`
3. **Deploy → Manage deployments → Edit (✏️) → Version: New version → Deploy**
4. Pastikan akses **Anyone** dan URL `/exec` sama dengan `BASE` di `src/api.ts`

Rollback: tempel ulang `Code.gs`, deploy versi baru.

## Kontrak API

Semua GET wajib `userId` (kecuali `sheet=akun`). Respons: `{ success, message, data }`.

| Request | Fungsi |
| --- | --- |
| `?sheet=akun&email=&password=` | Login |
| `?sheet=bootstrap&userId=` | **Baru** — `{ produk, konfigurasi }` sekali jalan |
| `?sheet=produk&userId=` | Daftar menu |
| `?sheet=konfigurasi&userId=` | Konfigurasi toko |
| `?sheet=transaksi&transaksiDate=dd-MM-yyyy&userId=` | Transaksi satu hari |
| `?sheet=transaksi&transaksiDate=…&includeItems=1&userId=` | **Baru** — plus `items` per transaksi |
| `?sheet=transaksi-item&transaksiId=…&userId=` | Item satu transaksi |
| `?sheet=transaksi-item&transaksiIds=A,B,C&userId=` | **Baru** — item banyak transaksi |
| `?sheet=stok&userId=` | Daftar stok |
| `?sheet=summary&userId=` | Statistik harian |

POST (`Content-Type: text/plain`, body JSON) + `?sheet=…&userId=…`:

- `transaksi` — `{...header transaksi, items: [...]}`; update status `{ id, value, isUpdate: true }`
- `stok` — `{ stok_id, nama, harga, satuan, harga_satuan, status }`, `isUpdate` / `isDelete`

## Yang dipercepat

| Optimasi | Efek |
| --- | --- |
| Cache validasi user 6 jam (`CacheService`) | Menghapus TextFinder + baca kolom status di setiap request |
| `sheet=bootstrap` | Home/Menu: 2 request → 1 |
| Cache produk & konfigurasi 2 menit | Baca sheet master hampir gratis |
| `includeItems=1` / `transaksiIds` | Detail & rekap: N request → 1 |
| Sortir pakai `sortKey()` | Tidak bikin objek `Date` per baris |
| Header sheet di-cache per eksekusi | 1 pembacaan header per sheet |
| `LockService` di doPost | Anti baris ganda saat simpan bersamaan |

Catatan: cache produk/konfigurasi 2 menit — edit menu langsung di spreadsheet bisa telat tampil maksimal 2 menit (refresh browser tidak memaksa). Ubah `DATA_TTL` kalau perlu lebih segar.
