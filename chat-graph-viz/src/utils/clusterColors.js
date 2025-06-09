// utils/clusterColors.js
// get distinct colors per clusterId
const PALETTE = [
  "#e45756", "#4e79a7", "#76b7b2", "#f28e2c", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ab",
  "#6a3d9a", "#1f78b4", "#33a02c", "#fb9a99", "#e31a1c",
  "#fdbf6f", "#cab2d6", "#b15928", "#a6cee3", "#b2df8a"
];
export function colorForCluster(clusterId, opts = {}) {
  const base = PALETTE[clusterId % PALETTE.length];
  if (opts.transparent) {
    // convert #RRGGBB to rgba
    const hex = base.replace('#','');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    return `rgba(${r},${g},${b},.75)`;  // tune alpha to taste
  }
  return base;
}
