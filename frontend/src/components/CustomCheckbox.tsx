type CustomCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function CustomCheckbox({
  checked,
  onChange,
  label,
}: CustomCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium"
      style={{
        background: 'color-mix(in srgb, var(--tg-hint) 10%, transparent)',
      }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: checked
            ? 'var(--tg-button)'
            : 'var(--app-surface)',
          border: checked
            ? '2px solid var(--tg-button)'
            : '2px solid color-mix(in srgb, var(--tg-hint) 45%, transparent)',
          color: 'var(--tg-button-text)',
        }}
      >
        {checked ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7.2L5.8 10L11 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span>{label}</span>
    </button>
  );
}
