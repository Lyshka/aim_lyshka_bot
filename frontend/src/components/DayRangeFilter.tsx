import type { ReactNode } from 'react';
import { CustomDateField } from './CustomDateField';

type DayRangeFilterProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
  background?: string;
  children?: ReactNode;
};

export function DayRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  disabled,
  background = 'var(--tg-secondary)',
  children,
}: DayRangeFilterProps) {
  return (
    <section
      className="space-y-3 rounded-3xl px-5 py-4"
      style={{ background }}
    >
      <p className="text-sm font-medium">Фильтры</p>
      <div className="grid grid-cols-2 gap-2">
        <CustomDateField label="От" value={from} onChange={onFromChange} />
        <CustomDateField label="До" value={to} onChange={onToChange} />
      </div>
      {children}
      <div className="grid grid-cols-2 gap-2">
        <FilterButton disabled={disabled} onClick={onApply} fullWidth>
          Применить
        </FilterButton>
        <FilterButton disabled={disabled} onClick={onReset} secondary fullWidth>
          Сбросить
        </FilterButton>
      </div>
    </section>
  );
}

function FilterButton({
  children,
  onClick,
  disabled,
  secondary,
  fullWidth,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50 ${fullWidth ? 'w-full' : ''}`}
      style={{
        background: secondary
          ? 'color-mix(in srgb, var(--tg-hint) 14%, transparent)'
          : 'var(--tg-button)',
        color: secondary ? 'var(--tg-text)' : 'var(--tg-button-text)',
      }}
    >
      {children}
    </button>
  );
}
