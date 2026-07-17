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
          d="M12 19 17.5 6.5 21 16h6l3.5-9.5L36 19v10.5c0 6.2-5.2 11.5-12 11.5S12 35.7 12 29.5V19Z"
          fill="currentColor"
        />
        <circle cx="19" cy="23.5" r="2.4" fill="#fff" />
        <circle cx="29" cy="23.5" r="2.4" fill="#fff" />
        <path d="M24 26.5 21.8 29.2h4.4L24 26.5Z" fill="#fff" />
        <path
          d="M14.8 28.5h4M29.2 28.5h4"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.8"
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
        <rect
          x="7"
          y="18"
          width="20"
          height="20"
          rx="4"
          fill="currentColor"
          opacity="0.55"
        />
        <circle cx="13.2" cy="24.2" r="1.7" fill="#fff" />
        <circle cx="20.8" cy="31.8" r="1.7" fill="#fff" />
        <circle cx="13.2" cy="31.8" r="1.7" fill="#fff" />
        <circle cx="20.8" cy="24.2" r="1.7" fill="#fff" />
        <rect x="17" y="10" width="22" height="22" rx="4.5" fill="currentColor" />
        <circle cx="28" cy="21" r="2" fill="#fff" />
        <circle cx="23.5" cy="15.8" r="1.7" fill="#fff" />
        <circle cx="32.5" cy="15.8" r="1.7" fill="#fff" />
        <circle cx="23.5" cy="26.2" r="1.7" fill="#fff" />
        <circle cx="32.5" cy="26.2" r="1.7" fill="#fff" />
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
