interface SkeletonLoaderProps {
  type?: "card" | "table" | "chart" | "profile";
}

export default function SkeletonLoader({ type = "card" }: SkeletonLoaderProps) {
  const pulse = "animate-pulse bg-muted rounded";

  if (type === "table") {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${pulse} h-10 w-full`} style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }
  if (type === "chart") {
    return <div className={`${pulse} h-64 w-full rounded-lg`} />;
  }
  if (type === "profile") {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <div className={`${pulse} h-16 w-16 rounded-full`} />
          <div className="space-y-2 flex-1">
            <div className={`${pulse} h-5 w-48`} />
            <div className={`${pulse} h-4 w-32`} />
          </div>
        </div>
        <div className={`${pulse} h-40 w-full`} />
      </div>
    );
  }
  return (
    <div className="space-y-3 p-4">
      <div className={`${pulse} h-4 w-3/4`} />
      <div className={`${pulse} h-8 w-1/2`} />
      <div className={`${pulse} h-4 w-full`} />
    </div>
  );
}
