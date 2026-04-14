import React from "react";
import { Timeline } from "@/components/ui/timeline";

const imgShadow =
  "rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]";

export function VayuDrishtiTimeline() {
  const data = [
    {
      title: "Step 1",
      content: (
        <div>
          <h4 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Multi-Source Data Ingestion
          </h4>
          <p className="text-neutral-700 dark:text-neutral-300 text-xs md:text-sm font-normal mb-8">
            EcoTrace pulls live emission data from factories, vehicles, and
            power plants every second — across Industry, Transport and Energy.
            At the same time, NASA satellites and independent air quality
            networks record the same atmosphere. No single source.
            No single point of trust.
          </p>
          <div className="mb-8">
            {[
              "🏭 Factory floor sensors — Industry sector",
              "🚗 Vehicle fleet trackers — Transport sector",
              "⚡ Power generation meters — Energy sector",
              "🛰️ NASA GEOS-CF satellite atmospheric readings",
              "🌍 OpenAQ global air quality network",
            ].map((item) => (
              <div
                key={item}
                className="flex gap-2 items-center text-neutral-700 dark:text-neutral-300 text-xs md:text-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="IoT sensors in factory"
              className={imgShadow}
            />
            <img
              src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Satellite view"
              className={imgShadow}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Step 2",
      content: (
        <div>
          <h4 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Verified Emission Calculation
          </h4>
          <p className="text-neutral-700 dark:text-neutral-300 text-xs md:text-sm font-normal mb-8">
            When a company submits a report, EcoTrace instantly cross-checks
            it against satellite data and independent sensors. If numbers
            don't match by more than 20%, the report is flagged before any
            regulator even opens it. All data is converted to standardized
            kg CO₂e using GHG Protocol methodology.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Satellite data"
              className={imgShadow}
            />
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Verification dashboard"
              className={imgShadow}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Step 3",
      content: (
        <div>
          <h4 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Predictive Analytics
          </h4>
          <p className="text-neutral-700 dark:text-neutral-300 text-xs md:text-sm font-normal mb-4">
            EcoTrace doesn't just track what happened — it predicts what's
            coming. Our AI flags dangerous emission spikes the moment they
            start and forecasts where each sector is headed over the next
            30, 60 and 90 days. Regulators act before a crisis, not after.
          </p>
          <div className="mb-8">
            {[
              "✅ Real-time spike detection — flagged in under 1 second",
              "✅ 87% forecast accuracy — 30, 60 & 90-day predictions",
              "✅ Cross-source mismatch detection by AI",
              "✅ Seasonal decomposition analysis per sector",
            ].map((item) => (
              <div
                key={item}
                className="flex gap-2 items-center text-neutral-700 dark:text-neutral-300 text-xs md:text-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="AI prediction"
              className={imgShadow}
            />
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Forecasting analytics"
              className={imgShadow}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Step 4",
      content: (
        <div>
          <h4 className="text-lg md:text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Public Accountability Dashboard
          </h4>
          <p className="text-neutral-700 dark:text-neutral-300 text-xs md:text-sm font-normal mb-4">
            All verified data is published live on a public map any citizen
            can open right now. Every company gets a daily A–F compliance
            grade. Every record is permanently locked on blockchain.
            No one can alter history. No one can hide their emissions anymore.
          </p>
          <div className="mb-8">
            {[
              "✅ Daily 0–100 public compliance score per company",
              "✅ Live Green→Red emission heatmap — no login needed",
              "✅ SHA-256 hashed records on Polygon blockchain",
              "✅ Regulators issue warnings directly from the platform",
            ].map((item) => (
              <div
                key={item}
                className="flex gap-2 items-center text-neutral-700 dark:text-neutral-300 text-xs md:text-sm"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.unsplash.com/photo-1639762681057-408e52192e55?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Blockchain audit"
              className={imgShadow}
            />
            <img
              src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600"
              alt="Public accountability"
              className={imgShadow}
            />
          </div>
        </div>
      ),
    },
  ];

  return <Timeline data={data} />;
}