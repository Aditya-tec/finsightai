/** SVG gradient pairs for chart fills — blue monochrome palette. */
export const CHART_GRADIENTS = [
  { id: "chartGrad0", from: "#66c2ff", to: "#0066b3" },
  { id: "chartGrad1", from: "#4db8ff", to: "#003d66" },
  { id: "chartGrad2", from: "#99d6ff", to: "#007acc" },
  { id: "chartGrad3", from: "#0099ff", to: "#004d80" },
  { id: "chartGrad4", from: "#7ecfff", to: "#005999" },
  { id: "chartGrad5", from: "#33aaff", to: "#002952" },
] as const;

export function chartGradientId(index: number): string {
  return CHART_GRADIENTS[index % CHART_GRADIENTS.length].id;
}

export const CHART_ANIM = {
  barDuration: 900,
  barStagger: 100,
  pieDuration: 1100,
  ease: "ease-out" as const,
};
