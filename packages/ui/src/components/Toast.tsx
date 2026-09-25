import { createContext, type ReactNode, use, useCallback, useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

interface ToastState {
  id: number;
  text: string;
  undo?: () => void | Promise<void>;
}

type ShowToast = (text: string, undo?: () => void | Promise<void>) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => use(ToastContext);

export function ToastProvider({ children, raised = false }: { children: ReactNode; raised?: boolean }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback<ShowToast>((text, undo) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), text, ...(undo ? { undo } : {}) });
    timer.current = setTimeout(() => setToast(null), undo ? 5000 : 2800);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <div key={toast.id} role="status" className={styles.toast} data-raised={raised}>
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              className={styles.undo}
              onClick={() => {
                void toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </ToastContext>
  );
}
