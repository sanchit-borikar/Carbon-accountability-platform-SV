export default function SDGSection() {
  const sdgs = [
    { num: 13, icon: "🌍", name: "Climate Action", color: "#2563eb" },
    { num: 9, icon: "🏗️", name: "Industry & Infrastructure", color: "#ea580c" },
    { num: 12, icon: "♻️", name: "Responsible Consumption", color: "#d97706" },
    { num: 16, icon: "⚖️", name: "Peace & Strong Institutions", color: "#7c3aed" },
  ];

  return (
    <section className="py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-display font-bold text-foreground text-center mb-12">Supporting Global Sustainable Goals</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sdgs.map((s, i) => (
            <div key={i} className="card-dashboard p-6 text-center" style={{ borderTop: `3px solid ${s.color}` }}>
              <span className="text-4xl block mb-3">{s.icon}</span>
              <div className="text-sm font-bold" style={{ color: s.color }}>SDG {s.num}</div>
              <div className="text-sm font-semibold text-foreground mt-1">{s.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
