import { useEffect, useRef, useState } from 'react';

type Option = {
  id: string;
  label: string;
};

type CustomSelectProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function CustomSelect({
  label,
  value,
  options,
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value) ?? options[0];

  useEffect(() => {
    function handlePointer(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handlePointer);
      document.addEventListener('touchstart', handlePointer);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="block text-sm">
      <span style={{ color: 'var(--tg-hint)' }}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative mt-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left"
        style={{ background: 'var(--tg-bg)' }}
      >
        <span className="font-medium">{selected?.label}</span>
        <span
          className="rounded-lg px-2 py-1 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
            color: 'var(--tg-button)',
          }}
        >
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open ? (
        <div
          className="mt-2 overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
          style={{
            background: 'var(--tg-bg)',
            border: '1px solid color-mix(in srgb, var(--tg-hint) 16%, transparent)',
          }}
        >
          {options.map((option) => {
            const active = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-3 text-left text-sm"
                style={{
                  background: active
                    ? 'color-mix(in srgb, var(--tg-button) 12%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--tg-button)' : 'var(--tg-text)',
                }}
              >
                <span className="font-medium">{option.label}</span>
                {active ? (
                  <span className="text-xs font-semibold">выбрано</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
