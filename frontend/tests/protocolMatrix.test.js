import { describe, it, expect } from 'vitest';
import {
  CLIENT_PROTOCOL_SUPPORT,
  CLIENT_ORDER,
  PROTOCOL_LABELS,
  getAllProtocols,
  buildMatrix,
} from '../src/utils/protocolMatrix.js';

describe('getAllProtocols', () => {
  it('returns a de-duplicated union of all client protocols', () => {
    const all = getAllProtocols();
    const unique = new Set(all);
    expect(all.length).toBe(unique.size);
    // universal is the superset
    CLIENT_PROTOCOL_SUPPORT.universal.forEach((p) => {
      expect(all).toContain(p);
    });
  });
});

describe('buildMatrix', () => {
  it('produces one row per protocol with a flag per client', () => {
    const matrix = buildMatrix();
    expect(matrix).toHaveLength(getAllProtocols().length);

    for (const row of matrix) {
      expect(row).toHaveProperty('protocol');
      expect(row).toHaveProperty('label');
      for (const client of CLIENT_ORDER) {
        expect(typeof row[client]).toBe('boolean');
      }
    }
  });

  it('marks support correctly for a known protocol', () => {
    const matrix = buildMatrix();
    const ssRow = matrix.find((r) => r.protocol === 'ss://');
    expect(ssRow.label).toBe(PROTOCOL_LABELS['ss://']);
    expect(ssRow.clash).toBe(true);
    expect(ssRow.shadowsocks).toBe(true);
  });

  it('reflects unsupported protocol per client', () => {
    const matrix = buildMatrix();
    const vlessRow = matrix.find((r) => r.protocol === 'vless://');
    // vless is not in surge list
    expect(vlessRow.surge).toBe(false);
    expect(vlessRow.clash).toBe(true);
  });
});
