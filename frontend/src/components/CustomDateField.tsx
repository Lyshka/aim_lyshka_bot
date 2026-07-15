import { useRef } from 'react';

type CustomDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function formatDisplay(value: string) {
  if (!value) {
    return 'Не выбрано';
  }
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export function CustomDateField({
  label,
  value,
  onChange,
}: CustomDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      //
    }

    input.focus();
    input.click();
  }

  return (
    <div className="block text-sm">
      <span style={{ color: 'var(--tg-hint)' }}>{label}</span>
      <button
        type="button"
        onClick={openPicker}
        className="relative mt-1 flex w-full items-center justify-between overflow-hidden rounded-2xl px-3 py-3 text-left"
        style={{ background: 'var(--tg-bg)' }}
      >
        <span className="font-medium">{formatDisplay(value)}</span>
        <span
          className="rounded-lg px-2 py-1 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
            color: 'var(--tg-button)',
          }}
        >
          Календарь
        </span>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={(e) => onChange((e.target as HTMLInputElement).value)}
          className="date-native-input"
          tabIndex={-1}
        />
      </button>
    </div>
  );
}
