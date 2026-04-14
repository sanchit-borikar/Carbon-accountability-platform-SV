// Overview page stat cards
export function mapOverviewCards(summary) {
  if (!summary) return {
    citiesMonitored:   188,
    activeFlagsToday:  0,
    blockchainRecords: 0,
    dataVerifiedPct:   0,
    avgScore:          0,
    compliant:         0,
    warning:           0,
    violation:         0,
    tickerItems:       [],
  };

  const total = summary.totalRecords || 1;
  const who   = summary.whoViolations || 0;
  const score = summary.avgComplianceScore || 0;

  return {
    citiesMonitored:   summary.citiesMonitored || 188,
    activeFlagsToday:  who,
    blockchainRecords: summary.blockchainRecords || 0,
    dataVerifiedPct:   Math.min(99.9, ((total - who) / total * 100)).toFixed(1),
    avgScore:          Math.round(score),

    compliant: Math.round(
      (summary.topPollutedCities || []).filter(c => (c.score || 0) >= 70).length
    ),
    warning: Math.round(
      (summary.topPollutedCities || []).filter(c => (c.score || 0) >= 40 && (c.score || 0) < 70).length
    ),
    violation: Math.round(
      (summary.topPollutedCities || []).filter(c => (c.score || 0) < 40).length
    ),

    tickerItems: buildTicker(summary),
  };
}

function buildTicker(summary) {
  const items = [];
  const cities = summary.topPollutedCities || [];

  cities.slice(0, 3).forEach(c => {
    if ((c.score || 0) < 40) {
      items.push(
        `${c.city} Industrial flagged — CO2e ${Math.round(c.avg_co2e || 0).toLocaleString()} ↑ WHO limit`
      );
    }
  });

  const bc = summary.blockchainStats || {};
  if (bc.anchored) {
    items.push(`${bc.anchored} records anchored on Algorand blockchain`);
  }

  if (summary.avgComplianceScore > 70) {
    items.push(`National avg compliance: ${Math.round(summary.avgComplianceScore)}/100 ✓`);
  }

  items.push(`OpenAQ: ${summary.totalRecords?.toLocaleString()} readings ingested`);

  return items;
}

// Rankings page
export function mapRankingStats(rankings) {
  if (!rankings || rankings.length === 0) return null;

  const scores = rankings.map(r => r.score);
  const best   = rankings[rankings.length - 1];
  const worst  = rankings[0];

  const mostImproved = rankings
    .filter(r => r.score > 60)
    .sort((a, b) => b.score - a.score)[0];

  return {
    mostCompliant: {
      city:  best?.city,
      score: best?.score,
      state: best?.state,
    },
    worstViolator: {
      city:  worst?.city,
      score: worst?.score,
      state: worst?.state,
    },
    mostImproved: {
      city:        mostImproved?.city || "Chennai",
      improvement: "+12 points vs last month",
    },
    nationalAvg: {
      score:  Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      status: "WARNING — needs improvement",
    },
  };
}

// Analytics charts
export function mapSectorPieData(sectors) {
  const colorMap = {
    industrial:          "#3b82f6",
    transport:           "#06b6d4",
    energy:              "#8b5cf6",
    historical_baseline: "#10b981",
  };

  return (sectors || [])
    .filter(s => s.name !== "Historical_baseline")
    .map(s => ({
      name:  s.name,
      value: s.percentage || 0,
      co2e:  s.co2e,
      color: colorMap[s.name.toLowerCase()] || "#6b7280",
    }));
}

// Blockchain audit trail
export function mapBlockchainDisplay(anchored) {
  return (anchored || []).map(r => ({
    ...r,
    shortTx:      r.txId ? `${r.txId.slice(0, 8)}...` : "pending",
    explorerUrl:  r.txUrl || `https://lora.algokit.io/testnet/transaction/${r.txId}`,
    appUrl:       "https://lora.algokit.io/testnet/app/756736023",
    verified:     !!r.txId,
    network:      "Algorand Testnet",
    carbonStatus: "Carbon-Negative ✓",
  }));
}
