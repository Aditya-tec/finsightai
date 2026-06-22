/** SVG gradient stops for chart fills — blue monochrome palette. */
export const CHART_GRADIENTS = [
  { id: "chartGrad0", from: "#9edbff", mid: "#49b6ff", to: "#005a99" },
  { id: "chartGrad1", from: "#7bcfff", mid: "#1ca3ff", to: "#00375e" },
  { id: "chartGrad2", from: "#b8e7ff", mid: "#65c6ff", to: "#006bb2" },
  { id: "chartGrad3", from: "#67c7ff", mid: "#0099ff", to: "#003f6b" },
  { id: "chartGrad4", from: "#94daff", mid: "#33adff", to: "#004f85" },
  { id: "chartGrad5", from: "#5ec4ff", mid: "#008de6", to: "#00213f" },
] as const;

export function chartGradientId(index: number): string {
  return CHART_GRADIENTS[index % CHART_GRADIENTS.length].id;
}

export const CHART_ANIM = {
  barDuration: 1200,
  barStagger: 130,
  pieDuration: 1400,
  ease: "ease-in-out" as const,
  spring: { type: "spring", stiffness: 130, damping: 20 },
};
