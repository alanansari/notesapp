import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: 'sm' | 'md';
}

export function SwitchTrack({ on, size = 'md' }: { on: boolean; size?: 'sm' | 'md' }) {
  return (
    <span className={styles.track} data-on={on} data-size={size} aria-hidden>
      <span className={styles.knob} />
    </span>
  );
}

export function Switch({ checked, onChange, label, size = 'md' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.button}
      onClick={() => onChange(!checked)}
    >
      <SwitchTrack on={checked} size={size} />
    </button>
  );
}
