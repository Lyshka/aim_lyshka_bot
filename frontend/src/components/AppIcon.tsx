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
          d="M16.5 31.5 31.5 16.5a6.5 6.5 0 0 1 9.2 9.2L25.7 40.7a6.5 6.5 0 0 1-9.2-9.2Z"
          fill="currentColor"
        />
        <path
          d="M16.5 31.5 31.5 16.5a6.5 6.5 0 1 0-9.2-9.2L7.3 22.3a6.5 6.5 0 0 0 9.2 9.2Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M19 19.5 28.5 29"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.9"
        />
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
          d="M10 18.5 16 8l5 7.5h6L32 8l6 10.5v11c0 7.5-5.5 13.5-14 13.5S10 37 10 29.5v-11Z"
          fill="currentColor"
        />
        <circle cx="18.5" cy="23" r="2.1" fill="#fff" />
        <circle cx="29.5" cy="23" r="2.1" fill="#fff" />
        <path
          d="M24 26.5c1.4 1.4 3.2 1.4 4.6 0"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M15 28.5h4M29 28.5h4"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (slug === 'health') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
        <path
          d="M24 38s-12-7.5-12-16a7 7 0 0 1 12-4 7 7 0 0 1 12 4c0 8.5-12 16-12 16Z"
          fill="currentColor"
        />
        <path
          d="M16 22h5l2.5-5 3 10 2-5H32"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (slug === 'games') {
    return (
      <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
        <path
          d="M10 20.5c0-3.6 2.9-6.5 6.5-6.5h15c3.6 0 6.5 2.9 6.5 6.5v7c0 3.6-2.9 6.5-6.5 6.5h-2.2l-3.3 4.4a1.5 1.5 0 0 1-2.4 0L20.3 34H16.5C12.9 34 10 31.1 10 27.5v-7Z"
          fill="currentColor"
        />
        <path
          d="M17.5 24h5M20 21.5v5"
          stroke="#fff"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="29.2" cy="22.2" r="1.7" fill="#fff" />
        <circle cx="32.5" cy="25.8" r="1.7" fill="#fff" />
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
  if (slug === 'health') {
    return {
      from: '#60a5fa',
      to: '#1d4ed8',
      glow: 'rgba(37, 99, 235, 0.4)',
    };
  }
  if (slug === 'games') {
    return {
      from: '#66c0f4',
      to: '#1b2838',
      glow: 'rgba(27, 40, 56, 0.45)',
    };
  }
  return {
    from: fallback,
    to: fallback,
    glow: 'rgba(0,0,0,0.2)',
  };
}
