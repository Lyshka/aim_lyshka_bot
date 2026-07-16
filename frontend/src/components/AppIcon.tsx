type AppIconProps = {
  slug: string;
  className?: string;
};

export function AppIcon({ slug, className = 'h-9 w-9' }: AppIconProps) {
  if (slug === 'meds') {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        aria-hidden
      >
        <path
          d="M18 10h12a4 4 0 0 1 4 4v4H14v-4a4 4 0 0 1 4-4Z"
          fill="currentColor"
          opacity="0.35"
        />
        <rect x="14" y="16" width="20" height="22" rx="6" fill="currentColor" />
        <path
          d="M14 27h20"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="24" cy="21" r="2.2" fill="#fff" opacity="0.9" />
        <circle cx="24" cy="33" r="2.2" fill="#fff" opacity="0.9" />
      </svg>
    );
  }

  if (slug === 'admin') {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={className}
        aria-hidden
      >
        <path
          d="M24 8 38 14v10c0 9.2-6.2 15.8-14 18.4C16.2 39.8 10 33.2 10 24V14l14-6Z"
          fill="currentColor"
        />
        <path
          d="M24 16v12"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="24" cy="33" r="2.2" fill="#fff" />
      </svg>
    );
  }

  if (slug === 'cats') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
        <path
          d="M12 20c0-6 4.5-10 12-10s12 4 12 10v8c0 6-5 11-12 11S12 34 12 28v-8Z"
          fill="currentColor"
        />
        <path d="M14 14 10 6l8 5" fill="currentColor" />
        <path d="M34 14 38 6l-8 5" fill="currentColor" />
        <circle cx="19" cy="22" r="2" fill="#fff" />
        <circle cx="29" cy="22" r="2" fill="#fff" />
        <path
          d="M22 28h4"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <rect x="10" y="10" width="28" height="28" rx="8" fill="currentColor" />
      <path
        d="M18 24h12M24 18v12"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function appAccent(slug: string, fallback: string) {
  if (slug === 'meds') {
    return {
      from: '#0d9488',
      to: '#115e59',
      glow: 'rgba(13, 148, 136, 0.45)',
    };
  }
  if (slug === 'admin') {
    return {
      from: '#64748b',
      to: '#1e293b',
      glow: 'rgba(30, 41, 59, 0.4)',
    };
  }
  if (slug === 'cats') {
    return {
      from: '#fb923c',
      to: '#c2410c',
      glow: 'rgba(234, 88, 12, 0.4)',
    };
  }
  return {
    from: fallback,
    to: fallback,
    glow: 'rgba(0,0,0,0.2)',
  };
}
