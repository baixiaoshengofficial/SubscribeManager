jest.mock('../config', () => ({
  databasePath: '/tmp/subscribe-manager-test/subscriptions.db'
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

const mockDb = {
  exec: jest.fn(),
  all: jest.fn()
};

jest.mock('sqlite', () => ({
  open: jest.fn(async () => mockDb)
}));

describe('database initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    mockDb.exec.mockReset();
    mockDb.all.mockReset();
    mockDb.all.mockResolvedValue([
      { name: 'subconvert_api' },
      { name: 'subconvert_url' }
    ]);
    mockDb.exec.mockResolvedValue();
  });

  it('uses PRAGMA rows to migrate subconvert_api into subconvert_url', async () => {
    const { initializeDatabase } = require('../database');

    await initializeDatabase();

    expect(mockDb.all).toHaveBeenCalledWith('PRAGMA table_info(subscriptions)');
    expect(mockDb.exec).toHaveBeenCalledWith(
      'UPDATE subscriptions SET subconvert_url = subconvert_api WHERE subconvert_url IS NULL AND subconvert_api IS NOT NULL'
    );
  });
});
