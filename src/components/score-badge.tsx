import { tierForScore, type ScoringTier } from "@/lib/scoring";

// Fundo suave a partir da cor da faixa (hex #rrggbb + alpha ~12%).
function softBg(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}1f` : color;
}

export function ScoreBadge({
  score,
  tiers,
  showLabel = true,
}: {
  score: number;
  tiers: ScoringTier[];
  showLabel?: boolean;
}) {
  const tier = tierForScore(score, tiers);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={
        tier
          ? { backgroundColor: softBg(tier.color), color: tier.color }
          : { backgroundColor: "var(--color-bg-surface-2, #f1f5f9)" }
      }
    >
      <span className="tabular-nums">{score}</span>
      {tier && showLabel ? <span>{tier.label}</span> : null}
    </span>
  );
}
