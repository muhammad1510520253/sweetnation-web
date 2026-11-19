import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
        <h3 className="no-print">{title}</h3>
        {children}
      </div>
    </div>
  );
}
