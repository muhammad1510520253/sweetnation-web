import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ToastKind = 'info' | 'success' | 'error';
type ToastCtx = { show: (message: string, kind?: ToastKind) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind; id: number } | null>(null);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

export const Spinner = () => <div className="loader" />;

export const Empty = ({ text = 'Belum ada data' }: { text?: string }) => (
  <div className="empty">{text}</div>
);

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div
        className="modal"
        style={wide ? { maxWidth: 720 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-x no-print" onClick={onClose} aria-label="Tutup">
          <X size={18} />
        </button>
        <h3 className="no-print">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/** Dialog konfirmasi kustom (pengganti window.confirm). */
export function Confirm({
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, lanjut',
  cancelLabel = 'Batal',
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-msg">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'danger' : ''}`.trim()}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Memproses…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
