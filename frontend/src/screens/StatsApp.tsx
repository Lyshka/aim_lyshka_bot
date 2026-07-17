import { useState } from 'react';
import { api, type StatsLookup } from '../api/client';
import { useTelegram } from '../telegram/TelegramProvider';

type StatsAppProps = {
  onBack: () => void;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function mapLabel(map: string) {
  return map.replace(/^de_/, '').replace(/^cs_/, '');
}

export function StatsApp({ onBack }: StatsAppProps) {
  const { initData, haptic } = useTelegram();
  const [steamInput, setSteamInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsLookup | null>(null);

  async function lookup() {
    if (!steamInput.trim()) {
      setError('Вставь ссылку на Steam или Steam ID');
      return;
    }
    setBusy(true);
    setError(null);
    haptic('medium');
    try {
      const result = await api.statsLookup(initData, steamInput.trim());
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  }

  const leetify = data?.leetify?.available ? data.leetify : null;
  const faceit = data?.faceit;

  return (
    <div className="relative mx-auto w-full max-w-md px-4 pt-5 pb-8">
      <button
        type="button"
        onClick={() => {
          haptic('light');
          onBack();
        }}
        className="rounded-2xl px-3 py-2 text-sm font-medium"
        style={{
          background: 'color-mix(in srgb, white 55%, #0e7490)',
        }}
      >
        ← Назад
      </button>

      <div className="mt-3 mb-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Статистика
        </h1>
        <p className="text-sm" style={{ color: 'var(--tg-hint)' }}>
          CS2, Faceit и Leetify по Steam-ссылке. Ничего не сохраняем.
        </p>
      </div>

      <section
        className="space-y-3 rounded-3xl px-4 py-4"
        style={{
          background: 'color-mix(in srgb, white 72%, #0e7490)',
        }}
      >
        <input
          value={steamInput}
          onChange={(e) => setSteamInput(e.target.value)}
          placeholder="https://steamcommunity.com/id/ник"
          className="w-full rounded-xl border-0 px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void lookup();
            }
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void lookup()}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
          style={{
            background: 'linear-gradient(145deg, #155e75, #0e7490)',
            color: '#ecfeff',
          }}
        >
          {busy ? 'Загружаем…' : 'Показать статистику'}
        </button>
      </section>

      {error ? (
        <p
          className="mt-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
            color: '#9f1239',
          }}
        >
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <section
            className="flex items-center gap-3 rounded-3xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, white 75%, #0e7490)',
            }}
          >
            {data.steam?.avatarUrl ? (
              <img
                src={data.steam.avatarUrl}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold"
                style={{ background: '#155e75', color: '#ecfeff' }}
              >
                CS
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {data.steam?.personaName || leetify?.name || 'Игрок'}
              </p>
              <a
                href={data.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium"
                style={{ color: '#0e7490' }}
              >
                Открыть Steam
              </a>
              <p className="mt-1 text-[11px]" style={{ color: 'var(--tg-hint)' }}>
                Источники:{' '}
                {[
                  data.sources.steam ? 'Steam' : null,
                  data.sources.leetify ? 'Leetify' : null,
                  data.sources.faceit ? 'Faceit' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'нет'}
              </p>
            </div>
          </section>

          {data.steam?.cs2 || data.steam?.bans ? (
            <section className="space-y-2">
              <SectionTitle>Steam</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Часов CS2"
                  value={data.steam.cs2?.hoursForever ?? '—'}
                />
                <StatTile
                  label="За 2 недели"
                  value={data.steam.cs2?.hours2Weeks ?? '—'}
                />
                <StatTile
                  label="VAC"
                  value={data.steam.bans?.vacBanned ? 'Да' : 'Нет'}
                  accent={data.steam.bans?.vacBanned ? '#dc2626' : '#16a34a'}
                />
                <StatTile
                  label="Game bans"
                  value={data.steam.bans?.numberOfGameBans ?? 0}
                  accent={
                    (data.steam.bans?.numberOfGameBans ?? 0) > 0
                      ? '#dc2626'
                      : undefined
                  }
                />
              </div>
            </section>
          ) : null}

          {leetify?.ranks ? (
            <section className="space-y-2">
              <SectionTitle>Звания</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Faceit lvl" value={leetify.ranks.faceitLevel ?? '—'} />
                <StatTile label="Faceit ELO" value={leetify.ranks.faceitElo ?? '—'} />
                <StatTile label="Premier" value={leetify.ranks.premier ?? '—'} />
                <StatTile label="Leetify" value={leetify.ranks.leetify ?? '—'} />
                <StatTile
                  label="Wingman"
                  value={leetify.ranks.wingmanName}
                />
                <StatTile
                  label="Матчей"
                  value={leetify.totalMatches ?? '—'}
                />
                <StatTile label="Winrate" value={leetify.winrate != null ? `${leetify.winrate}%` : '—'} />
                <StatTile
                  label="С"
                  value={formatDate(leetify.firstMatchDate)}
                />
              </div>

              {leetify.ranks.competitive.length > 0 ? (
                <div
                  className="space-y-2 rounded-3xl px-4 py-3"
                  style={{
                    background: 'color-mix(in srgb, white 75%, #0e7490)',
                  }}
                >
                  <p className="text-sm font-semibold">Competitive по картам</p>
                  {leetify.ranks.competitive.map((item) => (
                    <div
                      key={item.map}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{mapLabel(item.map)}</span>
                      <span className="shrink-0 font-semibold">{item.rankName}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {leetify?.rating ? (
            <section className="space-y-2">
              <SectionTitle>Leetify рейтинг</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Aim" value={leetify.rating.aim ?? '—'} />
                <StatTile
                  label="Positioning"
                  value={leetify.rating.positioning ?? '—'}
                />
                <StatTile label="Utility" value={leetify.rating.utility ?? '—'} />
                <StatTile label="Clutch" value={leetify.rating.clutch ?? '—'} />
                <StatTile label="Opening" value={leetify.rating.opening ?? '—'} />
                <StatTile label="CT" value={leetify.rating.ctLeetify ?? '—'} />
                <StatTile label="T" value={leetify.rating.tLeetify ?? '—'} />
              </div>
            </section>
          ) : null}

          {leetify?.stats ? (
            <section className="space-y-2">
              <SectionTitle>Детали</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="HS %"
                  value={
                    leetify.stats.headshotAccuracy != null
                      ? `${leetify.stats.headshotAccuracy}%`
                      : '—'
                  }
                />
                <StatTile
                  label="Spray %"
                  value={
                    leetify.stats.sprayAccuracy != null
                      ? `${leetify.stats.sprayAccuracy}%`
                      : '—'
                  }
                />
                <StatTile
                  label="Реакция"
                  value={
                    leetify.stats.reactionMs != null
                      ? `${leetify.stats.reactionMs} ms`
                      : '—'
                  }
                />
                <StatTile label="Preaim" value={leetify.stats.preaim ?? '—'} />
                <StatTile
                  label="Counter-strafe"
                  value={
                    leetify.stats.counterStrafe != null
                      ? `${leetify.stats.counterStrafe}%`
                      : '—'
                  }
                />
                <StatTile
                  label="Trade kills"
                  value={
                    leetify.stats.tradeKillSuccess != null
                      ? `${leetify.stats.tradeKillSuccess}%`
                      : '—'
                  }
                />
              </div>
            </section>
          ) : null}

          {leetify?.recentMatches && leetify.recentMatches.length > 0 ? (
            <section className="space-y-2">
              <SectionTitle>Последние матчи</SectionTitle>
              {leetify.recentMatches.map((match) => (
                <article
                  key={match.id}
                  className="rounded-2xl px-3 py-3"
                  style={{
                    background: 'color-mix(in srgb, white 75%, #0e7490)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {mapLabel(match.map) || 'карта'}
                    </p>
                    <p
                      className="text-xs font-semibold uppercase"
                      style={{
                        color:
                          match.outcome === 'win'
                            ? '#16a34a'
                            : match.outcome === 'loss'
                              ? '#dc2626'
                              : 'var(--tg-hint)',
                      }}
                    >
                      {match.outcome || '—'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
                    {match.source} · {formatDateTime(match.finishedAt)}
                    {match.score.length === 2
                      ? ` · ${match.score[0]}:${match.score[1]}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs">
                    {match.rankName}
                    {match.leetifyRating != null
                      ? ` · LR ${match.leetifyRating}`
                      : ''}
                    {match.headshotAccuracy != null
                      ? ` · HS ${match.headshotAccuracy}%`
                      : ''}
                  </p>
                </article>
              ))}
            </section>
          ) : null}

          {faceit ? (
            <section className="space-y-2">
              <SectionTitle>Faceit API</SectionTitle>
              <div
                className="rounded-3xl px-4 py-3"
                style={{
                  background: 'color-mix(in srgb, white 75%, #0e7490)',
                }}
              >
                <div className="flex items-center gap-3">
                  {faceit.avatar ? (
                    <img
                      src={faceit.avatar}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{faceit.nickname}</p>
                    <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
                      {faceit.country?.toUpperCase() || '—'}
                      {faceit.profileUrl ? (
                        <>
                          {' · '}
                          <a
                            href={faceit.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#0e7490' }}
                          >
                            профиль
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatTile label="CS2 lvl" value={faceit.cs2?.level ?? '—'} />
                <StatTile label="CS2 ELO" value={faceit.cs2?.elo ?? '—'} />
                <StatTile label="CS:GO lvl" value={faceit.csgo?.level ?? '—'} />
                <StatTile label="CS:GO ELO" value={faceit.csgo?.elo ?? '—'} />
              </div>

              {faceit.cs2?.stats ? (
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label="Матчи CS2"
                    value={String(faceit.cs2.stats.matches ?? '—')}
                  />
                  <StatTile
                    label="WR CS2"
                    value={String(faceit.cs2.stats.winRate ?? '—')}
                  />
                  <StatTile
                    label="K/D CS2"
                    value={String(faceit.cs2.stats.avgKd ?? '—')}
                  />
                  <StatTile
                    label="HS CS2"
                    value={String(faceit.cs2.stats.headshots ?? '—')}
                  />
                </div>
              ) : null}

              {faceit.csgo?.stats ? (
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label="Матчи CS:GO"
                    value={String(faceit.csgo.stats.matches ?? '—')}
                  />
                  <StatTile
                    label="WR CS:GO"
                    value={String(faceit.csgo.stats.winRate ?? '—')}
                  />
                  <StatTile
                    label="K/D CS:GO"
                    value={String(faceit.csgo.stats.avgKd ?? '—')}
                  />
                  <StatTile
                    label="HS CS:GO"
                    value={String(faceit.csgo.stats.headshots ?? '—')}
                  />
                </div>
              ) : null}

              {faceit.bans.length > 0 ? (
                <div
                  className="space-y-2 rounded-3xl px-4 py-3 text-sm"
                  style={{
                    background:
                      'color-mix(in srgb, #b42318 10%, var(--tg-secondary))',
                  }}
                >
                  <p className="font-semibold" style={{ color: '#9f1239' }}>
                    Faceit баны
                  </p>
                  {faceit.bans.map((ban, index) => (
                    <p key={`${ban.reason}-${index}`}>
                      {ban.type || 'ban'}: {ban.reason || '—'}
                    </p>
                  ))}
                </div>
              ) : null}

              {faceit.recentMatches.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-1 text-sm font-medium">Faceit матчи</p>
                  {faceit.recentMatches.slice(0, 10).map((match) => (
                    <article
                      key={match.matchId}
                      className="rounded-2xl px-3 py-3"
                      style={{
                        background: 'color-mix(in srgb, white 75%, #0e7490)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {mapLabel(match.map) || match.competition || 'матч'}
                        </p>
                        <p
                          className="text-xs font-semibold uppercase"
                          style={{
                            color:
                              match.result === 'win'
                                ? '#16a34a'
                                : match.result === 'loss'
                                  ? '#dc2626'
                                  : 'var(--tg-hint)',
                          }}
                        >
                          {match.result || '—'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
                        {match.mode} · {formatDateTime(match.finishedAt)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : data.sources.faceitConfigured === false ? (
            <p className="text-xs" style={{ color: 'var(--tg-hint)' }}>
              Для полной Faceit-статистики добавь FACEIT_API_KEY на сервер.
              Сейчас тянем Faceit lvl/ELO через Leetify.
            </p>
          ) : null}

          {data.leetify && !data.leetify.available ? (
            <p
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: 'color-mix(in srgb, #b42318 12%, var(--tg-secondary))',
                color: '#9f1239',
              }}
            >
              Профиль Leetify скрыт ({data.leetify.privacyMode}).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <p className="px-1 text-sm font-semibold">{children}</p>;
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      className="rounded-[22px] px-3 py-3"
      style={{
        background: 'color-mix(in srgb, white 75%, #0e7490)',
      }}
    >
      <p className="text-[11px] font-medium" style={{ color: 'var(--tg-hint)' }}>
        {label}
      </p>
      <p
        className="mt-1 text-base font-semibold leading-tight"
        style={{ color: accent ?? 'var(--tg-text)' }}
      >
        {value}
      </p>
    </div>
  );
}
