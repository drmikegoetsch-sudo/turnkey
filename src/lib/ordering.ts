// Fractional ordering: an item dropped between two others gets the midpoint
// of their positions, so a reorder writes one row instead of renumbering the
// whole list. Shared by the board, tasks, and materials.
export function positionBetween(
  before: number | undefined,
  after: number | undefined
) {
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (before !== undefined) return before + 1;
  if (after !== undefined) return after - 1;
  return 0;
}
