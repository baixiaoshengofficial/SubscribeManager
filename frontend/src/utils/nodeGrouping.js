export function getNodeSourceLabel(node, fallbackLabel) {
  return node?.source_name || fallbackLabel;
}

export function groupNodesBySource(nodes, fallbackLabel) {
  const groups = new Map();
  for (const node of nodes || []) {
    const source = getNodeSourceLabel(node, fallbackLabel);
    if (!groups.has(source)) groups.set(source, []);
    groups.get(source).push(node);
  }
  return Array.from(groups, ([source, groupedNodes]) => ({ source, nodes: groupedNodes }));
}

export function buildNodeCardItems(nodes, grouped, fallbackLabel) {
  if (!grouped) return (nodes || []).map((node) => ({ kind: 'node', node }));
  return groupNodesBySource(nodes, fallbackLabel).flatMap((group) => [
    { kind: 'group', source: group.source, count: group.nodes.length },
    ...group.nodes.map((node) => ({ kind: 'node', node }))
  ]);
}

export function getSourceRowspan(nodes, rowIndex, fallbackLabel) {
  const source = getNodeSourceLabel(nodes[rowIndex], fallbackLabel);
  if (rowIndex > 0 && getNodeSourceLabel(nodes[rowIndex - 1], fallbackLabel) === source) return 0;

  let rowspan = 1;
  while (
    rowIndex + rowspan < nodes.length
    && getNodeSourceLabel(nodes[rowIndex + rowspan], fallbackLabel) === source
  ) {
    rowspan++;
  }
  return rowspan;
}
