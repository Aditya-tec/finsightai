"use client";

import FormattedText from "@/components/FormattedText";
import { isBoilerplateIntro, type ScenarioBlocks } from "@/lib/parseBullBearBase";

type Props = {
  blocks: ScenarioBlocks;
};

const CARD_META: { key: keyof ScenarioBlocks; label: string; className: string }[] = [
  { key: "bull", label: "Bull Case", className: "scenario-card-bull" },
  { key: "bear", label: "Bear Case", className: "scenario-card-bear" },
  { key: "base", label: "Base Case", className: "scenario-card-base" },
];

export default function BullBearBaseCards({ blocks }: Props) {
  const cards = CARD_META.filter((c) => blocks[c.key]);

  return (
    <div className="bull-bear-wrap">
      {blocks.intro && !isBoilerplateIntro(blocks.intro) && (
        <p className="bull-bear-intro">
          <FormattedText text={blocks.intro} />
        </p>
      )}
      <div className="bull-bear-grid">
        {cards.map(({ key, label, className }) => (
          <div key={key} className={`scenario-card ${className}`}>
            <div className="scenario-card-label">{label}</div>
            <div className="scenario-card-body">
              <FormattedText text={blocks[key] as string} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
