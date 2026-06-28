const path = require('path');

const PORTS_MODULE = path.resolve(__dirname, '../../config/ports.cjs');

function loadPorts(envOverrides) {
  let exported;
  jest.isolateModules(() => {
    exported = require(PORTS_MODULE);
  });
  return exported;
}

describe('config/ports.cjs', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('parses BACKEND_PORT and FRONTEND_PORT from process.env', () => {
    process.env.BACKEND_PORT = '5100';
    process.env.FRONTEND_PORT = '5101';

    const { BACKEND_PORT, FRONTEND_PORT } = loadPorts();

    expect(BACKEND_PORT).toBe(5100);
    expect(FRONTEND_PORT).toBe(5101);
  });

  it('falls back FRONTEND_PORT to BACKEND_PORT when unset', () => {
    process.env.BACKEND_PORT = '8080';
    delete process.env.FRONTEND_PORT;

    const { BACKEND_PORT, FRONTEND_PORT } = loadPorts();

    expect(BACKEND_PORT).toBe(8080);
    expect(FRONTEND_PORT).toBe(8080);
  });

  it('returns numbers, not strings', () => {
    process.env.BACKEND_PORT = '3000';
    process.env.FRONTEND_PORT = '3000';

    const { BACKEND_PORT, FRONTEND_PORT } = loadPorts();

    expect(typeof BACKEND_PORT).toBe('number');
    expect(typeof FRONTEND_PORT).toBe('number');
  });

  it('throws when BACKEND_PORT is empty', () => {
    process.env.BACKEND_PORT = '   ';

    expect(() => loadPorts()).toThrow(/BACKEND_PORT is required|\.env is missing/);
  });

  it('throws on a non-numeric port', () => {
    process.env.BACKEND_PORT = 'abc';

    expect(() => loadPorts()).toThrow(/Invalid BACKEND_PORT/);
  });

  it('throws on an out-of-range port', () => {
    process.env.BACKEND_PORT = '70000';

    expect(() => loadPorts()).toThrow(/Invalid BACKEND_PORT/);
  });

  it('throws on an invalid FRONTEND_PORT', () => {
    process.env.BACKEND_PORT = '3000';
    process.env.FRONTEND_PORT = '0';

    expect(() => loadPorts()).toThrow(/Invalid FRONTEND_PORT/);
  });
});
