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
        <g transform="translate(12 12) scale(1)">
          <path
            fill="#fff"
            d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.962 20.307 6.59 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714 1.001 1.28 1.28 1.274.629 2.816.004 3.447-1.271.306-.617.314-1.318.047-1.942-.267-.625-.748-1.122-1.36-1.403-.612-.282-1.308-.295-1.942-.047l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.01L7.54 18.21zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.289-.005c0-1.252 1.02-2.274 2.274-2.274 1.251 0 2.274 1.022 2.274 2.274 0 1.251-1.023 2.274-2.274 2.274-1.254 0-2.274-1.023-2.274-2.274z"
          />
        </g>
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
