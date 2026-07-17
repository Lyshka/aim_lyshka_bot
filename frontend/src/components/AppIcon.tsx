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
        <rect x="6" y="6" width="36" height="36" rx="10" fill="currentColor" />
        <path
          d="M16.5 30.5c-2.2 0-4-1.8-4-4s1.8-4 4-4c.5 0 1 .1 1.4.3l3.2-4.6 4.2-1.2c.3-.9 1.1-1.5 2.1-1.5 1.2 0 2.2 1 2.2 2.2 0 1.2-1 2.2-2.2 2.2-.9 0-1.7-.6-2-1.4l-3.5 1-2.5 3.6c1 1 1.2 2.5.4 3.7-.5.8-1.4 1.3-2.3 1.3Z"
          fill="#fff"
        />
        <circle cx="30.5" cy="27.5" r="1.6" fill="#66c0f4" />
        <circle cx="34.2" cy="24.2" r="1.6" fill="#66c0f4" />
        <path
          d="M24 18.5c0-1.4 1.1-2.5 2.5-2.5S29 17.1 29 18.5 27.9 21 26.5 21 24 19.9 24 18.5Z"
          fill="#fff"
          opacity="0.9"
        />
        <path
          d="M15.2 27.8h2.6M16.5 26.5v2.6"
          stroke="#1b2838"
          strokeWidth="1.6"
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
