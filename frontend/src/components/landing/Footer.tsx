import { Globe, Linkedin, Youtube, ArrowUp } from "lucide-react";

const footerLinks = {
  Platform: [
    "IoT Dashboard",
    "Satellite Verification",
    "AI Analytics",
    "Blockchain Audit",
    "Compliance Scores",
  ],
  Integrations: [
    "MQTT Sensors",
    "Apache Kafka",
    "NASA GEOS-CF",
    "Google Earth Engine",
    "Polygon Blockchain",
  ],
  Resources: [
    "Documentation",
    "API Reference",
    "Methodology Hub",
    "Data Explorer",
    "Blog",
    "Changelog",
    "Help Center",
  ],
  Company: [
    "About Us",
    "Contact",
    "Careers",
    "Partners",
    "Media Kit",
    "Scientific Advisory",
  ],
};

const badges = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    alt: "NASA",
    label: "NASA GEOS-CF",
    sub: "Satellite Data Partner",
  },
  {
    src: "https://cdn.worldvectorlogo.com/logos/openaq.svg",
    alt: "OpenAQ",
    label: "OpenAQ",
    sub: "Air Quality Source",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Sustainability_icon.svg",
    alt: "GHG Protocol",
    label: "GHG Protocol",
    sub: "Emission Standard",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Polygon_Blockchain_Matic_Logo.svg",
    alt: "Polygon",
    label: "Polygon",
    sub: "Blockchain Network",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/c/c2/IPFS_logo_%282019%29.png",
    alt: "IPFS",
    label: "Pinata IPFS",
    sub: "Decentralized Storage",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Sustainable_Development_Goals.svg",
    alt: "SDG",
    label: "SDG 13 · 9 · 12 · 16",
    sub: "Climate Action Aligned",
  },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      {/* Badges / Partner Strip */}
      <div
        className="bg-[#0a1628]"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center text-center gap-3"
              >
                <img
                  src={badge.src}
                  alt={badge.alt}
                  className="h-[60px] w-auto object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
                <div>
                  <div className="text-xs font-semibold text-blue-200">
                    {badge.label}
                  </div>
                  <div className="text-[10px] text-blue-400">{badge.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-[#0a1628]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={22} className="text-blue-400" />
                <span className="font-extrabold text-lg text-white tracking-tight">
                  VayuDrishti
                </span>
              </div>
              <p className="text-sm text-blue-300/70 leading-relaxed mb-6">
                VayuDrishti is a carbon intelligence platform. It provides
                AI-powered emission tracking, satellite cross-verification, and
                blockchain-sealed public accountability for real climate action.
              </p>
              <div className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-3">
                Follow us:
              </div>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-10 h-10 rounded-full border border-blue-700 flex items-center justify-center hover:bg-blue-800 transition-colors"
                >
                  <Linkedin size={18} className="text-blue-300" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full border border-blue-700 flex items-center justify-center hover:bg-blue-800 transition-colors"
                >
                  <Youtube size={18} className="text-blue-300" />
                </a>
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-5">
                  {title}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-blue-200/70 hover:text-white transition-colors duration-200"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-900/50">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs text-blue-400/70">
              <a href="#" className="hover:text-white transition-colors">
                Terms &amp; Conditions
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Impressum
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
            <div className="text-xs text-blue-400/50">
              © {new Date().getFullYear()} VayuDrishti · Endor Environmental
              Alliance · Built for real climate accountability
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center transition-colors duration-200"
        aria-label="Scroll to top"
      >
        <ArrowUp size={20} />
      </button>
    </footer>
  );
}
