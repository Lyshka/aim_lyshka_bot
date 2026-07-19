import { useMemo, useState } from 'react';
import { api, type StatsLookup } from '../api/client';
import { Shell } from '../components/Shell';
import { useTelegram } from '../telegram/TelegramProvider';

type StatsAppProps = {
  onBack: () => void;
};

type Tab = 'overview' | 'leetify' | 'faceit' | 'matches';

const tabs = [
  { id: 'overview' as const, label: 'Обзор' },
  { id: 'leetify' as const, label: 'Leetify' },
  { id: 'faceit' as const, label: 'Faceit' },
  { id: 'matches' as const, label: 'Матчи' },
];

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

function fmt(value: string | number | null | undefined, suffix = '') {
  if (value == null || value === '') {
    return '—';
  }
  return `${value}${suffix}`;
}

function ageLabel(days: number | null | undefined) {
  if (days == null) {
    return '—';
  }
  if (days < 30) {
    return `${days} дн.`;
  }
  if (days < 365) {
    return `${Math.floor(days / 30)} мес.`;
  }
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years} г. ${months} мес.` : `${years} г.`;
}

function scoreLine(score: Record<string, number> | null | undefined) {
  if (!score) {
    return '';
  }
  const values = Object.values(score);
  if (values.length < 2) {
    return '';
  }
  return `${values[0]}:${values[1]}`;
}

function openUrl(url: string) {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
      return;
    }
  } catch {}
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function StatsApp({ onBack }: StatsAppProps) {
  const { initData, haptic } = useTelegram();
  const [steamInput, setSteamInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsLookup | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

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
      setTab('overview');
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  }

  const leetify = data?.leetify?.available ? data.leetify : null;
  const faceit = data?.faceit ?? null;

  const visibleTabs = useMemo(() => {
    if (!data) {
      return tabs.filter((item) => item.id === 'overview');
    }
    return tabs.filter((item) => {
      if (item.id === 'leetify') {
        return Boolean(leetify);
      }
      if (item.id === 'faceit') {
        return Boolean(faceit) || data.sources.faceitConfigured === false;
      }
      if (item.id === 'matches') {
        return Boolean(
          (leetify?.recentMatches && leetify.recentMatches.length > 0) ||
            (faceit?.recentMatches && faceit.recentMatches.length > 0),
        );
      }
      return true;
    });
  }, [data, leetify, faceit]);

  const activeTab = visibleTabs.some((item) => item.id === tab)
    ? tab
    : 'overview';

  return (
    <Shell tab={activeTab} onTabChange={setTab} tabs={visibleTabs}>
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
          CS2 по Steam-ссылке. Данные не сохраняем.
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

      {data && activeTab === 'overview' ? (
        <OverviewTab data={data} leetify={leetify} />
      ) : null}
      {data && activeTab === 'leetify' && leetify ? (
        <LeetifyTab leetify={leetify} />
      ) : null}
      {data && activeTab === 'faceit' ? (
        <FaceitTab data={data} faceit={faceit} />
      ) : null}
      {data && activeTab === 'matches' ? (
        <MatchesTab leetify={leetify} faceit={faceit} />
      ) : null}
    </Shell>
  );
}

function OverviewTab({
  data,
  leetify,
}: {
  data: StatsLookup;
  leetify: StatsLookup['leetify'] | null;
}) {
  const { haptic } = useTelegram();
  const bans = data.steam?.bans;

  return (
    <div className="mt-4 space-y-4">
      <section
        className="overflow-hidden rounded-3xl"
        style={{
          background:
            'linear-gradient(160deg, color-mix(in srgb, #0e7490 88%, #083344), color-mix(in srgb, #155e75 70%, #082f49))',
          color: '#ecfeff',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          {data.steam?.avatarUrl ? (
            <img
              src={data.steam.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/25"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold">
              CS
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">
              {data.steam?.personaName || leetify?.name || 'Игрок'}
            </p>
            <p className="mt-0.5 text-xs text-cyan-100/80">
              {[
                data.steam?.countryCode,
                data.steam?.steamLevel != null
                  ? `LVL ${data.steam.steamLevel}`
                  : null,
                ageLabel(data.steam?.accountAgeDays),
              ]
                .filter(Boolean)
                .join(' · ') || data.steamId}
            </p>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                openUrl(data.profileUrl);
              }}
              className="mt-2 text-xs font-semibold text-cyan-100 underline-offset-2 hover:underline"
            >
              Открыть Steam
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px bg-white/10">
          <HeroMetric
            label="Premier"
            value={fmt(leetify?.ranks?.premier)}
          />
          <HeroMetric
            label="Faceit"
            value={
              leetify?.ranks?.faceitLevel != null
                ? `lvl ${leetify.ranks.faceitLevel}`
                : data.faceit?.cs2?.level != null
                  ? `lvl ${data.faceit.cs2.level}`
                  : '—'
            }
          />
          <HeroMetric
            label="Leetify"
            value={fmt(leetify?.ranks?.leetify)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle>Аккаунт</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Часов CS2"
            value={fmt(data.steam?.cs2?.hoursForever)}
          />
          <StatTile
            label="За 2 недели"
            value={fmt(data.steam?.cs2?.hours2Weeks)}
          />
          <StatTile
            label="Возраст"
            value={ageLabel(data.steam?.accountAgeDays)}
          />
          <StatTile
            label="Создан"
            value={formatDate(data.steam?.createdAt)}
          />
          <StatTile
            label="VAC"
            value={bans?.vacBanned ? `Да (${bans.numberOfVacBans})` : 'Нет'}
            accent={bans?.vacBanned ? '#dc2626' : '#16a34a'}
          />
          <StatTile
            label="Game bans"
            value={fmt(bans?.numberOfGameBans ?? 0)}
            accent={(bans?.numberOfGameBans ?? 0) > 0 ? '#dc2626' : undefined}
          />
          <StatTile
            label="Community"
            value={bans?.communityBanned ? 'Бан' : 'Ок'}
            accent={bans?.communityBanned ? '#dc2626' : '#16a34a'}
          />
          <StatTile
            label="Economy"
            value={bans?.economyBan && bans.economyBan !== 'none' ? bans.economyBan : 'Ок'}
            accent={
              bans?.economyBan && bans.economyBan !== 'none'
                ? '#dc2626'
                : '#16a34a'
            }
          />
        </div>
        {bans?.vacBanned || (bans?.numberOfGameBans ?? 0) > 0 ? (
          <p className="px-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
            Дней с последнего бана: {bans?.daysSinceLastBan ?? '—'}
          </p>
        ) : null}
      </section>

      {leetify?.ranks ? (
        <section className="space-y-2">
          <SectionTitle>Звания</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Faceit ELO" value={fmt(leetify.ranks.faceitElo)} />
            <StatTile label="Wingman" value={leetify.ranks.wingmanName} />
            <StatTile label="Матчей" value={fmt(leetify.totalMatches)} />
            <StatTile
              label="Winrate"
              value={leetify.winrate != null ? `${leetify.winrate}%` : '—'}
            />
            <StatTile label="С" value={formatDate(leetify.firstMatchDate)} />
            <StatTile
              label="Leetify bans"
              value={fmt(leetify.bansCount ?? 0)}
              accent={(leetify.bansCount ?? 0) > 0 ? '#dc2626' : undefined}
            />
            {leetify.ranks.renown != null ? (
              <StatTile label="Renown" value={fmt(leetify.ranks.renown)} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionTitle>Трекеры</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <TrackerButton
            label="CS2 Tracker"
            hint="агрегатор + AI"
            onClick={() => {
              haptic('light');
              openUrl(data.trackers.cs2tracker);
            }}
          />
          <TrackerButton
            label="csstats"
            hint="Valve MM"
            onClick={() => {
              haptic('light');
              openUrl(data.trackers.csstats);
            }}
          />
          <TrackerButton
            label="csst.at"
            hint="быстрый профиль"
            onClick={() => {
              haptic('light');
              openUrl(data.trackers.csst);
            }}
          />
          <TrackerButton
            label="CSRep"
            hint="reputation"
            onClick={() => {
              haptic('light');
              openUrl(data.trackers.csrep);
            }}
          />
          <TrackerButton
            label="Leetify"
            hint="рейтинг"
            onClick={() => {
              haptic('light');
              openUrl(data.trackers.leetify);
            }}
          />
          {data.trackers.faceit ? (
            <TrackerButton
              label="Faceit"
              hint="профиль"
              onClick={() => {
                haptic('light');
                openUrl(data.trackers.faceit!);
              }}
            />
          ) : null}
        </div>
      </section>

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

      <p className="px-1 text-[11px]" style={{ color: 'var(--tg-hint)' }}>
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
  );
}

function LeetifyTab({
  leetify,
}: {
  leetify: NonNullable<StatsLookup['leetify']>;
}) {
  return (
    <div className="mt-4 space-y-4">
      {leetify.rating ? (
        <section className="space-y-2">
          <SectionTitle>Рейтинг</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Aim" value={fmt(leetify.rating.aim)} />
            <StatTile
              label="Positioning"
              value={fmt(leetify.rating.positioning)}
            />
            <StatTile label="Utility" value={fmt(leetify.rating.utility)} />
            <StatTile label="Clutch" value={fmt(leetify.rating.clutch)} />
            <StatTile label="Opening" value={fmt(leetify.rating.opening)} />
            <StatTile label="CT" value={fmt(leetify.rating.ctLeetify)} />
            <StatTile label="T" value={fmt(leetify.rating.tLeetify)} />
          </div>
        </section>
      ) : null}

      {leetify.stats ? (
        <section className="space-y-2">
          <SectionTitle>Aim & utility</SectionTitle>
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
              label="Spotted %"
              value={
                leetify.stats.spottedAccuracy != null
                  ? `${leetify.stats.spottedAccuracy}%`
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
            <StatTile label="Preaim" value={fmt(leetify.stats.preaim)} />
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
            <StatTile
              label="Flash / FB"
              value={fmt(leetify.stats.flashPerFlashbang)}
            />
            <StatTile
              label="HE dmg avg"
              value={fmt(leetify.stats.heDamageAvg)}
            />
            <StatTile
              label="Opening CT"
              value={
                leetify.stats.openingDuelCt != null
                  ? `${leetify.stats.openingDuelCt}%`
                  : '—'
              }
            />
            <StatTile
              label="Opening T"
              value={
                leetify.stats.openingDuelT != null
                  ? `${leetify.stats.openingDuelT}%`
                  : '—'
              }
            />
            {leetify.stats.kd != null ? (
              <StatTile label="K/D" value={fmt(leetify.stats.kd)} />
            ) : null}
            {leetify.stats.adr != null ? (
              <StatTile label="ADR" value={fmt(leetify.stats.adr)} />
            ) : null}
            {leetify.stats.kast != null ? (
              <StatTile label="KAST" value={fmt(leetify.stats.kast, '%')} />
            ) : null}
          </div>
        </section>
      ) : null}

      {leetify.ranks?.competitive && leetify.ranks.competitive.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Competitive</SectionTitle>
          <div
            className="space-y-2 rounded-3xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, white 75%, #0e7490)',
            }}
          >
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
        </section>
      ) : null}
    </div>
  );
}

function FaceitTab({
  data,
  faceit,
}: {
  data: StatsLookup;
  faceit: StatsLookup['faceit'] | null;
}) {
  if (!faceit) {
    return (
      <p className="mt-4 text-sm" style={{ color: 'var(--tg-hint)' }}>
        {data.sources.faceitConfigured === false
          ? 'Для полной Faceit-статистики добавь FACEIT_API_KEY. Сейчас lvl/ELO есть во вкладке Обзор через Leetify.'
          : 'Faceit-профиль не найден.'}
      </p>
    );
  }

  const cs2Maps = faceit.cs2?.stats?.maps ?? [];

  return (
    <div className="mt-4 space-y-4">
      <section
        className="flex items-center gap-3 rounded-3xl px-4 py-3"
        style={{
          background: 'color-mix(in srgb, white 75%, #0e7490)',
        }}
      >
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
            {[faceit.country?.toUpperCase(), faceit.cs2?.region]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="CS2 lvl" value={fmt(faceit.cs2?.level)} />
        <StatTile label="CS2 ELO" value={fmt(faceit.cs2?.elo)} />
        <StatTile label="CS:GO lvl" value={fmt(faceit.csgo?.level)} />
        <StatTile label="CS:GO ELO" value={fmt(faceit.csgo?.elo)} />
      </div>

      {faceit.cs2?.stats ? (
        <section className="space-y-2">
          <SectionTitle>CS2 lifetime</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Матчи" value={fmt(faceit.cs2.stats.matches)} />
            <StatTile label="WR %" value={fmt(faceit.cs2.stats.winRate)} />
            <StatTile label="K/D" value={fmt(faceit.cs2.stats.avgKd)} />
            <StatTile label="K/R" value={fmt(faceit.cs2.stats.avgKr)} />
            <StatTile label="HS %" value={fmt(faceit.cs2.stats.headshots)} />
            <StatTile label="Победы" value={fmt(faceit.cs2.stats.wins)} />
            <StatTile
              label="Win streak"
              value={fmt(faceit.cs2.stats.currentWinStreak)}
            />
            <StatTile
              label="Best streak"
              value={fmt(faceit.cs2.stats.longestWinStreak)}
            />
          </div>
        </section>
      ) : null}

      {cs2Maps.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Карты Faceit</SectionTitle>
          <div
            className="space-y-2 rounded-3xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, white 75%, #0e7490)',
            }}
          >
            {cs2Maps.slice(0, 10).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">{mapLabel(item.label)}</span>
                <span className="shrink-0 text-xs" style={{ color: 'var(--tg-hint)' }}>
                  {fmt(item.matches)} · WR {fmt(item.winRate)} · KD{' '}
                  {fmt(item.avgKd)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {faceit.csgo?.stats ? (
        <section className="space-y-2">
          <SectionTitle>CS:GO lifetime</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Матчи" value={fmt(faceit.csgo.stats.matches)} />
            <StatTile label="WR %" value={fmt(faceit.csgo.stats.winRate)} />
            <StatTile label="K/D" value={fmt(faceit.csgo.stats.avgKd)} />
            <StatTile label="HS %" value={fmt(faceit.csgo.stats.headshots)} />
          </div>
        </section>
      ) : null}

      {faceit.bans.length > 0 ? (
        <div
          className="space-y-2 rounded-3xl px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in srgb, #b42318 10%, var(--tg-secondary))',
          }}
        >
          <p className="font-semibold" style={{ color: '#9f1239' }}>
            Faceit баны
          </p>
          {faceit.bans.map((ban, index) => (
            <p key={`${ban.reason}-${index}`}>
              {ban.type || 'ban'}: {ban.reason || '—'}
              {ban.endsAt ? ` · до ${formatDate(ban.endsAt)}` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MatchesTab({
  leetify,
  faceit,
}: {
  leetify: StatsLookup['leetify'] | null;
  faceit: StatsLookup['faceit'] | null;
}) {
  const leetifyMatches = leetify?.recentMatches ?? [];
  const faceitMatches = faceit?.recentMatches ?? [];

  return (
    <div className="mt-4 space-y-4">
      {leetifyMatches.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Leetify</SectionTitle>
          {leetifyMatches.map((match) => (
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
                <OutcomeBadge outcome={match.outcome} />
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
                {match.sprayAccuracy != null
                  ? ` · spray ${match.sprayAccuracy}%`
                  : ''}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {faceitMatches.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Faceit</SectionTitle>
          {faceitMatches.slice(0, 15).map((match) => (
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
                <OutcomeBadge outcome={match.result} />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--tg-hint)' }}>
                {[match.mode, formatDateTime(match.finishedAt), scoreLine(match.score)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string | null | undefined }) {
  const value = (outcome || '').toLowerCase();
  const color =
    value === 'win'
      ? '#16a34a'
      : value === 'loss'
        ? '#dc2626'
        : 'var(--tg-hint)';
  return (
    <p className="text-xs font-semibold uppercase" style={{ color }}>
      {outcome || '—'}
    </p>
  );
}

function TrackerButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[22px] px-3 py-3 text-left transition active:scale-[0.98]"
      style={{
        background: 'color-mix(in srgb, white 75%, #0e7490)',
      }}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--tg-hint)' }}>
        {hint}
      </p>
    </button>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/20 px-3 py-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-cyan-100/70">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
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
