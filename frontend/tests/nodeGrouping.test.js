import { describe, expect, it } from 'vitest';
import {
  buildNodeCardItems,
  getSourceRowspan,
  groupNodesBySource
} from '../src/utils/nodeGrouping';

const nodes = [
  { id: 1, name: 'A1', source_name: 'Airport A' },
  { id: 2, name: 'B1', source_name: 'Airport B' },
  { id: 3, name: 'A2', source_name: 'Airport A' },
  { id: 4, name: 'Manual' }
];

describe('node grouping', () => {
  it('groups nodes by provider while preserving source and node order', () => {
    expect(groupNodesBySource(nodes, 'Ungrouped')).toEqual([
      { source: 'Airport A', nodes: [nodes[0], nodes[2]] },
      { source: 'Airport B', nodes: [nodes[1]] },
      { source: 'Ungrouped', nodes: [nodes[3]] }
    ]);
  });

  it('adds group headings only in grouped card mode', () => {
    const groupedItems = buildNodeCardItems(nodes, true, 'Ungrouped');
    expect(groupedItems.filter((item) => item.kind === 'group')).toEqual([
      { kind: 'group', source: 'Airport A', count: 2 },
      { kind: 'group', source: 'Airport B', count: 1 },
      { kind: 'group', source: 'Ungrouped', count: 1 }
    ]);
    expect(buildNodeCardItems(nodes, false, 'Ungrouped')).toHaveLength(4);
  });

  it('calculates merged source cells for grouped table rows', () => {
    const groupedNodes = groupNodesBySource(nodes, 'Ungrouped').flatMap((group) => group.nodes);
    expect(groupedNodes.map((_, index) => getSourceRowspan(groupedNodes, index, 'Ungrouped')))
      .toEqual([2, 0, 1, 1]);
  });
});
