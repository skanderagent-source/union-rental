type LangFlagProps = {
  lang: 'fr' | 'en';
  className?: string;
};

export function LangFlag({ lang, className }: LangFlagProps) {
  if (lang === 'fr') {
    return (
      <svg
        className={className}
        viewBox="0 0 20 14"
        width={20}
        height={14}
        aria-hidden="true"
        focusable="false"
      >
        <rect width="6.67" height="14" fill="#002395" />
        <rect x="6.67" width="6.66" height="14" fill="#fff" />
        <rect x="13.33" width="6.67" height="14" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 20 14"
      width={20}
      height={14}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.4" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#c8102e" strokeWidth="1.2" />
      <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="3.2" />
      <path d="M10 0v14M0 7h20" stroke="#c8102e" strokeWidth="1.6" />
    </svg>
  );
}
