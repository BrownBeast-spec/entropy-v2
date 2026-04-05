import type { Metric } from "@/lib/utils/reportMetrics";

interface MetricCardProps {
  metric: Metric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon;

  return (
    <div className="rounded-lg border border-border bg-background p-4 transition-colors hover:bg-accent/50">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        {metric.trend ? (
          <span
            className={`rounded px-1.5 py-0.5 text-2xs ${
              metric.trend === "up"
                ? "bg-green-500/10 text-green-700"
                : metric.trend === "down"
                  ? "bg-red-500/10 text-red-700"
                  : "bg-gray-500/10 text-gray-700"
            }`}
          >
            {metric.trendValue}
          </span>
        ) : null}
      </div>
      <div className="mb-1 text-2xl font-bold text-foreground">
        {metric.value}
        {metric.unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {metric.unit}
          </span>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground">{metric.label}</div>
    </div>
  );
}
