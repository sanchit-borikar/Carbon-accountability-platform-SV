import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface HashDisplayProps {
  hash: string;
  showBadge?: boolean;
}

export default function HashDisplay({ hash, showBadge = false }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);
  const truncated = hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-4)}` : hash;

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-[#f1f5f9] rounded-full px-3 py-1 border border-transparent hover:border-[#2563eb]/20 transition-all">
        <span className="font-mono text-xs text-[#64748b]">{truncated}</span>
        <div className="relative group cursor-pointer hover:text-[#2563eb] transition-all active:scale-90" onClick={handleCopy}>
          {copied ? <Check size={12} className="text-[#059669] animate-[wobble_0.5s_ease-in-out]" /> : <Copy size={12} />}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {copied ? "Copied!" : "Copy Hash"}
          </div>
        </div>
      </div>
      {showBadge && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">✓ On-Chain</span>
      )}
    </div>
  );
}
