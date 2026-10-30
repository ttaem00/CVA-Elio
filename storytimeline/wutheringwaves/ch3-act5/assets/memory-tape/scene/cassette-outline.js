// Projected GLB vertices stay vectors throughout the opening mask. Coordinates
// may extend beyond the viewport while the cassette approaches the camera.
const MAX_POINTS = 2048;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

export function convexOutline(points) {
  if (!Array.isArray(points) || points.length > MAX_POINTS) return [];
  const sorted = [];
  for (const point of points) if (finitePoint(point)) sorted.push({ x: point.x, y: point.y });
  sorted.sort((a, b) => a.x - b.x || a.y - b.y);
  const unique = [];
  for (const point of sorted) {
    const previous = unique[unique.length - 1];
    if (!previous || previous.x !== point.x || previous.y !== point.y) unique.push(point);
  }
  if (unique.length < 3) return unique;
  // Andrew's monotone chain removes interior and collinear points. The result
  // has a stable winding and no repeated closing vertex.
  const lower = [], upper = [];
  for (const point of unique) {
    while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  for (let i = unique.length - 1; i >= 0; i--) {
    const point = unique[i];
    while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

export function roundedOutlinePath(points, width, height, rounding = .04) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !Number.isFinite(rounding)) return '';
  const hull = convexOutline(points);
  if (hull.length < 3) return '';
  const pixels = hull.map(point => ({ x: point.x * width, y: point.y * height }));
  if (!pixels.every(finitePoint)) return '';
  // Trim at most 15% of either neighbouring edge and 1.2% of the viewport's
  // shorter side. Rounding=.04 means 4% of the shorter neighbouring edge.
  const fraction = Math.max(0, Math.min(.15, rounding)), cap = Math.min(width, height) * .012;
  const corners = pixels.map((point, i) => {
    const before = pixels[(i + pixels.length - 1) % pixels.length], after = pixels[(i + 1) % pixels.length];
    const incoming = Math.hypot(before.x - point.x, before.y - point.y), outgoing = Math.hypot(after.x - point.x, after.y - point.y);
    const radius = Math.min(incoming * fraction, outgoing * fraction, cap);
    return {
      point,
      enter: { x: point.x + (before.x - point.x) * radius / incoming, y: point.y + (before.y - point.y) * radius / incoming },
      leave: { x: point.x + (after.x - point.x) * radius / outgoing, y: point.y + (after.y - point.y) * radius / outgoing },
    };
  });
  if (!corners.every(corner => finitePoint(corner.enter) && finitePoint(corner.leave))) return '';
  const pair = point => `${Number(point.x.toFixed(3))} ${Number(point.y.toFixed(3))}`;
  const commands = [`M ${pair(corners[0].enter)}`];
  for (let i = 0; i < corners.length; i++) {
    const { point, enter, leave } = corners[i];
    if (i) commands.push(`L ${pair(enter)}`);
    commands.push(`Q ${pair(point)} ${pair(leave)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}
