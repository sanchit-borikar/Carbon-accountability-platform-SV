import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, suffix = "" }: { value: string; suffix?: string }) {
  return (
    <span
      className="font-display font-extrabold text-[36px] inline-block animate-[countUp_1s_ease-out_forwards]"
      style={{
        background: "linear-gradient(135deg, #2563eb, #0891b2)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}
    >
      {value}{suffix}
    </span>
  );
}

export default function StatsRow() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { number: "3+", desc: "Sectors tracked in real-time", sub: "Industry · Transport · Energy", icon: "🏭", iconBg: "bg-blue-50 text-blue-600" },
    { number: "87%", desc: "Forecast accuracy achieved", sub: "Facebook Prophet 30/60/90-day", icon: "📊", iconBg: "bg-blue-50 text-blue-600" },
    { number: "∞", desc: "Immutable blockchain records", sub: "Polygon network + IPFS archive", icon: "🔗", iconBg: "bg-purple-50 text-purple-600" },
    { number: "0–100", desc: "Daily compliance score", sub: "A/B/C/D/F public grade system", icon: "✓", iconBg: "bg-teal-50 text-teal-600" },
  ];

  return (
    <section ref={ref} className="py-12 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl border border-slate-200 border-t-[3px] border-t-[#2563eb] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(37,99,235,0.15)] transition-all duration-300 relative ${visible ? "animate-fade-up" : "opacity-0"}`}
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "forwards" }}
            >
              <div className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-lg ${s.iconBg}`}>
                {s.icon}
              </div>
              <AnimatedNumber value={s.number} />
              <p className="text-[13px] font-semibold text-[#64748b] mt-2">{s.desc}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
