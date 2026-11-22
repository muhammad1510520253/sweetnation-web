import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, X } from 'lucide-react';
import { api, rupiah, type Stock } from '../api';
import { useAuth } from '../auth';
import { Pager, usePaged } from '../Pagination';
import { Confirm, Empty, Modal, Spinner, useToast } from '../ui';
import { Select } from '../Select';

const UNITS = [
  { type: 'kg', value: 1000 },
  { type: 'gr', value: 1 },
  { type: 'pcs', value: 1 },
  { type: 'sisir', value: 1 },
  { type: 'L', value: 1000 },
  { type: 'pc', value: 1 },
  { type: 'ml', value: 1 },
];
const STATUSES = ['Habis', 'Sedikit', 'Banyak'];
const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `ST${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const satuanText = (v?: string | number | null) => String(v ?? '').trim();
const qtyOf = (v?: string | number | null) => satuanText(v).split(' ')[0] ?? '';
const unitOf = (v?: string | number | null) => {
  const parts = satuanText(v).split(' ').filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(' ') : 'unit';
};

type FormState = { id?: string; nama: string; jumlah: string; unit: string; harga: string; status: string };
const emptyForm: FormState = { nama: '', jumlah: '', unit: 'pcs', harga: '', status: 'Banyak' };

export default function StockPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [rows, setRows] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Semua');
  const [form, setForm] = useState<FormState | null>(null);
  const [ask, setAsk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.stocks(user.user_id);
      setRows(data ?? []);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal memuat stok', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, show]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const key = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === 'Semua' || (r.status ?? 'Banyak') === filter) &&
        (!key || (r.nama ?? '').toLowerCase().includes(key)),
    );
  }, [rows, q, filter]);

  const paged = usePaged(shown, { size: 20, resetKey: `${q}|${filter}` });

  const toggle = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Pilih/hapus pilih semua baris di halaman aktif. */
  const togglePage = () => {
    const ids = paged.slice.map((r) => r.stok_id);
    const all = ids.length > 0 && ids.every((id) => sel.has(id));
    setSel((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  /** Ubah status banyak stok sekaligus. Apps Script hanya bisa 1 baris per
   *  request, jadi dikirim berurutan (2 worker) — cukup untuk puluhan bahan. */
  const bulkStatus = async (status: string) => {
    if (!user || sel.size === 0 || bulkBusy) return;
    const targets = rows.filter((r) => sel.has(r.stok_id));
    const queue = [...targets];
    let done = 0;
    let fail = 0;
    setBulkBusy(`0/${targets.length}`);

    const worker = async () => {
      while (queue.length) {
        const s = queue.shift();
        if (!s) break;
        try {
          await api.saveStock(user.user_id, {
            stok_id: s.stok_id,
            nama: s.nama,
            harga: Number(s.harga) || 0,
            satuan: satuanText(s.satuan),
            harga_satuan: Number(s.harga_satuan) || 0,
            status,
            isUpdate: true,
            isDelete: false,
          });
          done += 1;
        } catch {
          fail += 1;
        }
        setBulkBusy(`${done + fail}/${targets.length}`);
      }
    };

    await Promise.all([worker(), worker()]);
    setBulkBusy('');
    setSel(new Set());
    show(
      fail ? `${done} diperbarui, ${fail} gagal` : `${done} stok → ${status}`,
      fail ? 'error' : 'success',
    );
    await load();
  };

  const hargaSatuan = useMemo(() => {
    if (!form) return 0;
    const jumlah = Number(form.jumlah) || 0;
    const harga = Number(form.harga) || 0;
    const unit = UNITS.find((u) => u.type === form.unit)?.value ?? 1;
    return jumlah > 0 ? harga / (jumlah * unit) : 0;
  }, [form]);

  const save = async () => {
    if (!user || !form) return;
    if (!form.nama.trim()) return show('Nama stok wajib diisi', 'error');
    const payload = {
      stok_id: form.id ?? stamp(),
      nama: form.nama.trim(),
      harga: Number(form.harga) || 0,
      satuan: `${Number(form.jumlah) || 0} ${form.unit}`,
      harga_satuan: hargaSatuan,
      status: form.status,
      isUpdate: Boolean(form.id),
      isDelete: false,
    };
    setAsk(false);
    setSaving(true);
    try {
      await api.saveStock(user.user_id, payload);
      show(form.id ? 'Stok diperbarui' : 'Stok ditambahkan', 'success');
      setForm(null);
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal menyimpan stok', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: Stock) => {
    const qty = qtyOf(s.satuan);
    const unit = unitOf(s.satuan);
    setForm({
      id: s.stok_id,
      nama: s.nama,
      jumlah: qty ?? '',
      unit: unit ?? 'pcs',
      harga: String(s.harga ?? ''),
      status: s.status || 'Banyak',
    });
  };

  return (
    <div className="content">
      <div className="page-max">
        <div className="page-head">
          <h2>Stok</h2>
          <span className="sub">{shown.length} bahan</span>
          <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => setForm({ ...emptyForm })}>
            <Plus size={14} /> Tambah
          </button>
        </div>

        <div className="stock-tools">
          <div className="search-wrap">
            <Search size={16} style={{ color: '#555' }} />
            <input className="input" placeholder="Cari stok…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {shown.length > 0 && (
            <button className="btn xs ghost" onClick={togglePage} title="Pilih semua yang tampil">
              {paged.slice.every((r) => sel.has(r.stok_id)) ? 'Batal pilih' : 'Pilih semua'}
            </button>
          )}
        </div>

        <div className="filters">
          {['Semua', ...STATUSES].map((s) => (
            <button key={s} className={`btn xs ${filter === s ? '' : 'ghost'}`} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <Empty text="Belum ada data stok" />
        ) : (
          <>
            <div className={`list grid-2${sel.size ? ' bulk-open' : ''}`}>
              {paged.slice.map((s) => (
                <div className={`stock-row ${sel.has(s.stok_id) ? 'on' : ''}`} key={s.stok_id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={sel.has(s.stok_id)}
                    aria-label={`Pilih ${s.nama}`}
                    className="pick"
                    onClick={() => toggle(s.stok_id)}
                  >
                    {sel.has(s.stok_id) && <Check size={13} strokeWidth={3} />}
                  </button>
                  <div className="info">
                    <div className="nm">{s.nama}</div>
                    <div className="meta">
                      {satuanText(s.satuan)} • {rupiah(s.harga)} • {rupiah(s.harga_satuan)}/{unitOf(s.satuan)}
                    </div>
                  </div>
                  <span className={`chip ${(s.status ?? 'Banyak').toLowerCase()}`}>{s.status ?? 'Banyak'}</span>
                  <button className="icon-btn" onClick={() => openEdit(s)} aria-label={`Ubah ${s.nama}`}><Pencil size={14} /></button>
                </div>
              ))}
            </div>

            {sel.size > 0 && (
              <div className="bulk-bar">
                <span className="bulk-count">
                  {bulkBusy ? `Menyimpan ${bulkBusy}` : `${sel.size} dipilih`}
                </span>
                <div className="bulk-actions">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      className={`btn xs ${st.toLowerCase()}`}
                      onClick={() => void bulkStatus(st)}
                      disabled={Boolean(bulkBusy)}
                    >
                      {st}
                    </button>
                  ))}
                  <button
                    className="icon-btn"
                    onClick={() => setSel(new Set())}
                    aria-label="Batal pilih"
                    disabled={Boolean(bulkBusy)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <Pager
              page={paged.page}
              pages={paged.pages}
              total={paged.total}
              size={paged.size}
              onPage={paged.setPage}
              onSize={paged.setSize}
            />
          </>
        )}
      </div>

      {form && (
        <Modal title={form.id ? 'Ubah Stok' : 'Tambah Stok'} onClose={() => setForm(null)}>
          <div className="field">
            <label>Nama Bahan *</label>
            <input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </div>
          <div className="row">
            <div className="field">
              <label>Jumlah</label>
              <input className="input" type="number" min={0} value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} />
            </div>
            <div className="field">
              <label>Satuan</label>
              <Select value={form.unit} options={UNITS.map((u) => ({ value: u.type, label: u.type }))} onChange={(v) => setForm({ ...form, unit: v })} ariaLabel="Satuan" />
            </div>
          </div>
          <div className="field">
            <label>Harga Total (Rp)</label>
            <input className="input" type="number" min={0} value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} />
            <span className="hint">Harga satuan: {rupiah(hargaSatuan)}</span>
          </div>
          <div className="field">
            <label>Status</label>
            <Select value={form.status} options={STATUSES.map((s) => ({ value: s, label: s }))} onChange={(v) => setForm({ ...form, status: v })} ariaLabel="Status" />
          </div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setForm(null)}>Batal</button>
            <button
              className="btn"
              onClick={() => {
                if (!form.nama.trim()) return show('Nama stok wajib diisi', 'error');
                setAsk(true);
              }}
              disabled={saving}
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {ask && form && (
        <Confirm
          title={form.id ? 'Simpan Perubahan?' : 'Tambah Stok?'}
          message={
            <>
              {form.id ? 'Perubahan stok' : 'Stok baru'}{' '}
              <strong>{form.nama.trim() || '-'}</strong> akan disimpan.
            </>
          }
          confirmLabel="Simpan"
          busy={saving}
          onConfirm={save}
          onCancel={() => setAsk(false)}
        />
      )}
    </div>
  );
}
