import { useEffect, useState } from 'react';
import { api, type Medication } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

const emptyForm = {
  name: '',
  tabletsCount: '',
  mgPerTablet: '',
  intervalDays: '1',
  instructions: '',
};

export function SettingsScreen() {
  const { initData, haptic } = useTelegram();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .overview(initData)
      .then((data) => {
        if (!alive) {
          return;
        }
        setMeds(data.medications);
      })
      .catch((err: Error) => setStatus(err.message));
    return () => {
      alive = false;
    };
  }, [initData]);

  function startEdit(med: Medication) {
    haptic('light');
    setCreating(false);
    setEditingId(med.id);
    setForm({
      name: med.name,
      tabletsCount: String(med.tabletsCount),
      mgPerTablet: String(med.mgPerTablet),
      intervalDays: String(med.intervalDays),
      instructions: med.instructions ?? '',
    });
    setStatus(null);
  }

  function startCreate() {
    haptic('light');
    setEditingId(null);
    setCreating(true);
    setForm({
      ...emptyForm,
      intervalDays: '1',
    });
    setStatus(null);
  }

  async function saveMed() {
    setBusy(true);
    haptic('medium');
    try {
      if (creating) {
        const created = await api.createMed(initData, {
          name: form.name.trim(),
          tabletsCount: Number(form.tabletsCount),
          mgPerTablet: Number(form.mgPerTablet),
          intervalDays: Number(form.intervalDays),
          instructions: form.instructions.trim(),
        });
        setMeds((prev) => [...prev, created]);
        setCreating(false);
        setForm(emptyForm);
        setStatus('Препарат добавлен');
      } else if (editingId) {
        const updated = await api.updateMed(initData, editingId, {
          name: form.name.trim(),
          tabletsCount: Number(form.tabletsCount),
          mgPerTablet: Number(form.mgPerTablet),
          intervalDays: Number(form.intervalDays),
          instructions: form.instructions.trim(),
        });
        setMeds((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingId(null);
        setStatus('Сохранено');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Дозировки и дни</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--tg-hint)' }}>
          Меняй существующие препараты или добавляй свои.
        </p>
      </div>

      <button
        type="button"
        disabled={busy || creating}
        onClick={startCreate}
        className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
        style={{
          background: 'var(--tg-button)',
          color: 'var(--tg-button-text)',
        }}
      >
        Добавить свой препарат
      </button>

      {creating ? (
        <section
          className="space-y-3 rounded-3xl px-5 py-4"
          style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
        >
          <h3 className="font-display text-lg font-semibold">Новый препарат</h3>
          <Field
            label="Название"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <Field
              label="Шт"
              value={form.tabletsCount}
              onChange={(v) => setForm((f) => ({ ...f, tabletsCount: v }))}
              type="number"
            />
            <Field
              label="Мг"
              value={form.mgPerTablet}
              onChange={(v) => setForm((f) => ({ ...f, mgPerTablet: v }))}
              type="number"
            />
            <Field
              label="Дни"
              value={form.intervalDays}
              onChange={(v) => setForm((f) => ({ ...f, intervalDays: v }))}
              type="number"
            />
          </div>
          <TextArea
            label="Инструкция"
            value={form.instructions}
            onChange={(v) => setForm((f) => ({ ...f, instructions: v }))}
            placeholder="Как принимать"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveMed()}
              className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
              style={{
                background: 'var(--tg-button)',
                color: 'var(--tg-button-text)',
              }}
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setForm(emptyForm);
              }}
              className="rounded-2xl px-4 py-3 text-sm font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
              }}
            >
              Отмена
            </button>
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {meds.map((med) => {
          const editing = editingId === med.id;
          return (
            <article
              key={med.id}
              className="rounded-3xl px-5 py-4"
              style={{ background: 'color-mix(in srgb, var(--app-surface-muted) 50%, var(--app-surface))', boxShadow: 'inset 0 0 0 1px var(--app-border)' }}
            >
              {!editing ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{med.name}</h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--tg-hint)' }}>
                      {med.tabletsCount} шт × {med.mgPerTablet} мг · каждые{' '}
                      {med.intervalDays} дн.
                    </p>
                    {med.instructions ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {med.instructions}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(med)}
                    className="rounded-xl px-3 py-2 text-sm font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
                    }}
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Field
                    label="Название"
                    value={form.name}
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Field
                      label="Шт"
                      value={form.tabletsCount}
                      onChange={(v) => setForm((f) => ({ ...f, tabletsCount: v }))}
                      type="number"
                    />
                    <Field
                      label="Мг"
                      value={form.mgPerTablet}
                      onChange={(v) => setForm((f) => ({ ...f, mgPerTablet: v }))}
                      type="number"
                    />
                    <Field
                      label="Дни"
                      value={form.intervalDays}
                      onChange={(v) => setForm((f) => ({ ...f, intervalDays: v }))}
                      type="number"
                    />
                  </div>
                  <TextArea
                    label="Инструкция"
                    value={form.instructions}
                    onChange={(v) => setForm((f) => ({ ...f, instructions: v }))}
                    placeholder="Как принимать"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveMed()}
                      className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                      style={{
                        background: 'var(--tg-button)',
                        color: 'var(--tg-button-text)',
                      }}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-2xl px-4 py-3 text-sm font-semibold"
                      style={{
                        background:
                          'color-mix(in srgb, var(--tg-hint) 14%, transparent)',
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {status ? (
        <p
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, var(--tg-button) 14%, transparent)',
          }}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span style={{ color: 'var(--tg-hint)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border-0 px-3 py-2 outline-none"
        style={{ background: 'var(--app-surface)', color: 'var(--tg-text)' }}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span style={{ color: 'var(--tg-hint)' }}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full resize-y rounded-xl border-0 px-3 py-2 outline-none"
        style={{ background: 'var(--app-surface)', color: 'var(--tg-text)' }}
      />
    </label>
  );
}
