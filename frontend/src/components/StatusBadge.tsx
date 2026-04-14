interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<string, { classes: string; label: string }> = {
    verified: { classes: "bg-[#dcfce7] text-[#15803d] border border-[#86efac]", label: "✓ VERIFIED" },
    flagged: { classes: "bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5] animate-[pulse_1.5s_ease_infinite]", label: "⚠ FLAGGED" },
    pending: { classes: "bg-[#fef3c7] text-[#d97706] border border-[#fcd34d]", label: "⏳ PENDING" },
    resolved: { classes: "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]", label: "✓ RESOLVED" },
    warning_sent: { classes: "bg-[#fff7ed] text-[#ea580c] border border-[#fdba74]", label: "⚡ WARNING SENT" },
    confirmed: { classes: "bg-[#dcfce7] text-[#15803d] border border-[#86efac]", label: "✓ CONFIRMED" },
  };
  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${config.classes}`}>
      {config.label}
    </span>
  );
}
