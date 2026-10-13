import {
  resourceListQuerySchema,
  updateResourceSchema,
} from './resource.schemas.js';
import { requestFingerprint } from './idempotency.service.js';

describe('resource request schemas', () => {
  it('applies the documented pagination defaults and upper bound', () => {
    expect(resourceListQuerySchema.parse({})).toMatchObject({
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    });
    expect(resourceListQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false,
    );
    expect(
      resourceListQuerySchema.safeParse({ sort: 'arbitrarySql' }).success,
    ).toBe(false);
    expect(
      resourceListQuerySchema.safeParse({ unknown: 'field' }).success,
    ).toBe(false);
  });

  it('requires at least one update field and bounds public data', () => {
    expect(updateResourceSchema.safeParse({}).success).toBe(false);
    expect(
      updateResourceSchema.safeParse({ title: '  Updated  ' }),
    ).toMatchObject({ success: true, data: { title: 'Updated' } });
    expect(
      updateResourceSchema.safeParse({ title: 'x', unexpected: true }).success,
    ).toBe(false);
  });

  it('fingerprints equivalent JSON bodies independent of property order', () => {
    expect(requestFingerprint({ title: 'same', description: null })).toBe(
      requestFingerprint({ description: null, title: 'same' }),
    );
    expect(requestFingerprint({ title: 'same' })).not.toBe(
      requestFingerprint({ title: 'different' }),
    );
  });
});
