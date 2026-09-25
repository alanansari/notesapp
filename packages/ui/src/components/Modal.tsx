import { type ReactNode, useEffect } from 'react';
import { cx } from '../lib/format';
import styles from './Modal.module.css';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  label: string;
  className?: string;
  fullscreenOnMobile?: boolean;
  style?: React.CSSProperties;
}

export function Modal({ onClose, children, label, className, fullscreenOnMobile, style }: ModalProps) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className={cx(styles.overlay, fullscreenOnMobile && styles.fullscreen)} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cx(styles.dialog, className)}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
