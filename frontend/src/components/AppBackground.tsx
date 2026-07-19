export type AppBackgroundVariant =
  | 'launcher'
  | 'meds'
  | 'health'
  | 'cats'
  | 'games'
  | 'stats'
  | 'study'
  | 'admin';

type AppBackgroundProps = {
  variant: AppBackgroundVariant;
};

export function AppBackground({ variant }: AppBackgroundProps) {
  return (
    <>
      <div className={`app-bg app-bg-${variant}`} aria-hidden />
      {variant === 'launcher' || variant === 'admin' ? (
        <>
          <div className="app-orb app-orb-a" aria-hidden />
          <div className="app-orb app-orb-b" aria-hidden />
        </>
      ) : null}
      {variant === 'launcher' ? <div className="app-grid" aria-hidden /> : null}
      {variant === 'health' ? <div className="app-orb app-orb-health" aria-hidden /> : null}
      {variant === 'cats' ? <div className="app-orb app-orb-cats" aria-hidden /> : null}
      {variant === 'games' ? <div className="app-orb app-orb-games" aria-hidden /> : null}
      {variant === 'stats' ? <div className="app-orb app-orb-stats" aria-hidden /> : null}
      {variant === 'study' ? <div className="app-orb app-orb-study" aria-hidden /> : null}
    </>
  );
}
