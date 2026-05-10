import logoWhite from "@/assets/logo-white.png";
import logoGreen from "@/assets/logo-green.png";

export function Logo({
  size = 32,
  withText = false,
  variant = "white",
  className = "",
}: {
  size?: number;
  withText?: boolean;
  variant?: "white" | "green";
  className?: string;
}) {
  const logoUrl = variant === "green" ? logoGreen : logoWhite;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src={logoUrl}
        alt="Anderdzi"
        height={size}
        className="block shrink-0 object-contain"
        style={{ height: size, width: "auto" }}
      />
    </span>
  );
}
