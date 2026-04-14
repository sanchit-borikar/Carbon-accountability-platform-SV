import { cn } from "@/lib/utils";
  import {
  IconBolt,
  IconSatellite,
  IconChartBar,
  IconLink,
  IconRouteAltLeft,
  IconAlertTriangle,
  IconBrain,
  IconWorld,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
  {
    title: "Real-Time IoT Ingestion",
    description:
      "Live CO₂ data via paho-mqtt with JWT auth across all 3 sectors.",
    icon: <IconBolt />,
  },
  {
    title: "Satellite Cross-Verification",
    description:
      "NASA GEOS-CF triangulates readings. Discrepancies above 20% auto-flagged.",
    icon: <IconSatellite />,
  },
  {
    title: "87% Forecast Accuracy",
    description:
      "Prophet predicts emissions 30, 60 & 90 days ahead using AI.",
    icon: <IconChartBar />,
  },
  {
    title: "Blockchain Audit Trail",
    description:
      "Every record SHA-256 hashed on Polygon. Permanently tamper-proof.",
    icon: <IconLink />,
  },
  {
    title: "3 Sectors Tracked",
    description:
      "Industry, Transport & Energy monitored from one unified platform.",
    icon: <IconRouteAltLeft />,
  },
  {
    title: "Live Regulator Alerts",
    description:
      "Instant alerts with one-click PDF reports and company warnings.",
    icon: <IconAlertTriangle />,
  },
  {
    title: "AI Anomaly Detection",
    description:
      "PyTorch + XGBoost flags spikes and mismatches in under 1 second.",
    icon: <IconBrain />,
  },
  {
    title: "Public Transparency",
    description:
      "Live heatmaps and compliance scores. No login needed.",
    icon: <IconWorld />,
  },
];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r  py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
