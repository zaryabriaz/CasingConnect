type MarkProps = {
  size?: number;
  /** Kept for callers; mark works on light and dark. */
  onDark?: boolean;
  className?: string;
};

/** Icon-only mark (sausages + interlocking rings). */
export function LogoMark({ size = 36, className = '' }: MarkProps) {
  return (
    <picture>
      <source srcSet="/casingconnect-mark.webp?v=4" type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/casingconnect-mark.png?v=4"
        alt=""
        width={size}
        height={size}
        className={`logo-mark ${className}`.trim()}
        decoding="async"
      />
    </picture>
  );
}

/** Full logo with wordmark and tagline. */
export function LogoLockup({
  height = 44,
  className = '',
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round(height * (871 / 393));
  return (
    <picture>
      <source srcSet="/casingconnect-logo.webp?v=4" type="image/webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/casingconnect-logo.png?v=4"
        alt="CasingConnect"
        width={width}
        height={height}
        className={`logo-lockup ${className}`.trim()}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
      />
    </picture>
  );
}
