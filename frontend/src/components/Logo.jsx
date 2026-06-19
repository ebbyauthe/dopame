export const Logo = ({ className = "", size = 28, dark = false }) => (
  <div className={`flex items-center gap-2 ${className}`} data-testid="brand-logo">
    <div
      className="flex items-center justify-center rounded-xl shadow-sm"
      style={{
        width: size,
        height: size,
        background: dark
          ? "linear-gradient(135deg,#fff,#e2e8f0)"
          : "linear-gradient(135deg,#0f172a,#334155)",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L9.5 9.5L2 12L9.5 14.5L12 22L14.5 14.5L22 12L14.5 9.5L12 2Z"
          fill={dark ? "#0f172a" : "#fff"}
        />
      </svg>
    </div>
    <span
      className={`font-display font-semibold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
      style={{ fontSize: size * 0.7 }}
    >
      Dopame
    </span>
  </div>
);
