import { Check } from "lucide-react";
import type { SearchResult } from "@/lib/api/search";

interface SearchResultCardProps {
  result: SearchResult;
  selected: boolean;
  onToggle: (id: string) => void;
  onViewDetails: (result: SearchResult) => void;
}

export default function SearchResultCard({
  result,
  selected,
  onToggle,
  onViewDetails,
}: SearchResultCardProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent/50"
      }`}
    >
      <button
        onClick={() => onToggle(result.id)}
        className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
          selected
            ? "border-primary bg-primary"
            : "border-border hover:border-primary"
        }`}
        role="checkbox"
        aria-checked={selected}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium leading-tight">{result.label}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{result.source}</p>
          </div>
          <div className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
            {result.helpfulness.score}
          </div>
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {result.helpfulness.explanation}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {result.entityType}
          </span>
          <button
            onClick={() => onViewDetails(result)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
