import logoUrl from "@/assets/logo.png";

export function Logo({
  size = 32,
  withText = false,
  className = "",
}: {
  size?: number;
  withText?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={logoUrl}
        alt="Anderdzi"
        width={size}
        height={size}
        className="block shrink-0 object-contain"
        style={{
          width: size,
          height: size,
          filter:
            "drop-shadow(0 0 0.5px rgba(255,255,255,0.9)) drop-shadow(0 0 0.5px rgba(255,255,255,0.9)) drop-shadow(0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent))",
        }}
      />
      {withText && (
        <span
          className="font-semibold tracking-tight"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            letterSpacing: "-0.02em",
            fontSize: Math.max(14, Math.round(size * 0.5)),
          }}
        >
          Anderdzi
        </span>
      )}
    </span>
  );
}
