type Option = {
  id: string;
  label: string;
};

type ChipSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className="rounded-xl px-3 py-2 text-sm font-medium"
            style={{
              background: active
                ? 'var(--tg-button)'
                : 'color-mix(in srgb, var(--tg-hint) 12%, transparent)',
              color: active ? 'var(--tg-button-text)' : 'var(--tg-text)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
