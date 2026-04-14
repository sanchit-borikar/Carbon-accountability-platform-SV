export default function HowItWorks() {
  const steps = [
    {
      num: "1", icon: "📡", title: "Multi-Source Data Ingestion",
      desc: "IoT sensors, NASA GEOS-CF satellite feeds, and OpenAQ public APIs stream live emission data across all 3 sectors via Apache Kafka.",
      tags: ["paho-mqtt", "NASA GEOS-CF", "OpenAQ", "Kafka"],
    },
    {
      num: "2", icon: "🤖", title: "AI Cross-Verification",
      desc: "PyTorch + XGBoost triangulate data sources. Discrepancies >20% trigger automatic flags. GHG Protocol converts ppm to kg CO₂e.",
      tags: ["PyTorch", "XGBoost", "Facebook Prophet", "87% accuracy"],
    },
    {
      num: "3", icon: "🔗", title: "Blockchain Accountability",
      desc: "Every verified record gets SHA-256 hashed and permanently written to Polygon. IPFS CIDs stored on-chain. Public scores updated daily.",
      tags: ["Polygon", "Solidity", "Truffle", "Pinata IPFS"],
    },
  ];

  return (
    <section className="py-20" style={{ background: "#f0f7ff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-foreground">How VayuDrishti Works</h2>
          <p className="text-muted-foreground mt-2">Three steps from raw data to public accountability</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="card-dashboard p-8 animate-fade-up" style={{ animationDelay: `${i * 0.15}s`, animationFillMode: "forwards" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full btn-primary-gradient flex items-center justify-center text-sm font-bold" style={{ cursor: "default" }}>{s.num}</div>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
              <div className="flex flex-wrap gap-2">
                {s.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-light-bg text-primary font-medium">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
