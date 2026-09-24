export function structureColor(structure) {
  if (structure === "backwardation") return "var(--delta-up)";
  if (structure === "contango") return "var(--delta-down)";
  return "var(--text-secondary)";
}
