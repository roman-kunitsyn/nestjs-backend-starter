import {
  decodeCursor,
  encodeCursor,
  parsePaginationQuery,
} from './pagination.js';

describe('pagination contract utilities', () => {
  const secret = 'a sufficiently long cursor signing secret for tests';

  it('applies bounded pagination defaults and rejects unsupported sort fields', () => {
    expect(parsePaginationQuery({}, ['createdAt', 'id'])).toEqual({
      limit: 20,
      order: 'desc',
    });
    expect(() =>
      parsePaginationQuery({ sort: 'password' }, ['createdAt', 'id']),
    ).toThrow('unsupported sort field');
    expect(() =>
      parsePaginationQuery({ limit: '101' }, ['createdAt', 'id']),
    ).toThrow('Invalid pagination');
  });

  it('signs opaque cursors and binds them to query and tenant context', () => {
    const cursor = encodeCursor(
      { createdAt: '2026-01-01', id: 'row-1' },
      {
        query: 'projects:list',
        tenantId: 'org-a',
      },
      secret,
    );
    expect(cursor).not.toContain('org-a');
    expect(
      decodeCursor(
        cursor,
        { query: 'projects:list', tenantId: 'org-a' },
        secret,
      ),
    ).toEqual({ createdAt: '2026-01-01', id: 'row-1' });
    expect(() =>
      decodeCursor(
        cursor,
        { query: 'projects:list', tenantId: 'org-b' },
        secret,
      ),
    ).toThrow('does not match');
    expect(() =>
      decodeCursor(
        `${cursor}x`,
        { query: 'projects:list', tenantId: 'org-a' },
        secret,
      ),
    ).toThrow('Invalid cursor');
  });
});
