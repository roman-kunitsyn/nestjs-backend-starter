import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, ilike, lt, gt, or } from 'drizzle-orm';
import { encodeCursor, decodeCursor } from '../../common/http/pagination.js';
import {
  DATABASE,
  type Database,
} from '../../infrastructure/database/database.types.js';
import { exampleResources } from '../../infrastructure/database/schema/resources.schema.js';
import {
  membershipRoles,
  organizationMemberships,
  organizations,
  roles,
} from '../../infrastructure/database/schema/organizations.schema.js';
import { PermissionService } from '../auth/permission.service.js';
import { resourceResponseSchema } from './resource.schemas.js';
import type {
  CreateResourceInput,
  ResourceListQuery,
  UpdateResourceInput,
} from './resource.schemas.js';
import {
  assertResourceAccess,
  type ResourceAction,
} from './resource.policy.js';
import type { OrganizationRole } from '../auth/access-control.js';
import {
  IdempotencyService,
  requestFingerprint,
} from './idempotency.service.js';

const notFound = () =>
  new NotFoundException({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Resource was not found',
  });
type CursorValue = { createdAt: string; id: string };
const cursorValueSchema = (value: unknown): CursorValue => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('createdAt' in value) ||
    !('id' in value) ||
    typeof value.createdAt !== 'string' ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    typeof value.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.id,
    )
  ) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Invalid cursor',
    });
  }
  return { createdAt: value.createdAt, id: value.id };
};

@Injectable()
export class ResourcesService {
  private readonly cursorSecret: string;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly permissions: PermissionService,
    private readonly idempotency: IdempotencyService,
    config: ConfigService,
  ) {
    this.cursorSecret = config.getOrThrow<string>('RESOURCE_CURSOR_SECRET');
  }

  async create(
    userId: string,
    organizationId: string,
    key: string,
    input: CreateResourceInput,
  ) {
    await this.permissions.assertPermission(
      userId,
      organizationId,
      'resources:create',
    );
    const result = await this.idempotency.execute({
      organizationId,
      actorUserId: userId,
      key,
      fingerprint: requestFingerprint(input),
      responseStatus: 201,
      parseResponse: (value: unknown) => resourceResponseSchema.parse(value),
      perform: async (tx) => {
        const [membership] = await tx
          .select({ id: organizationMemberships.id })
          .from(organizationMemberships)
          .innerJoin(
            organizations,
            eq(organizations.id, organizationMemberships.organizationId),
          )
          .where(
            and(
              eq(organizationMemberships.organizationId, organizationId),
              eq(organizationMemberships.userId, userId),
              eq(organizationMemberships.status, 'active'),
              eq(organizations.status, 'active'),
            ),
          )
          .limit(1);
        if (!membership) throw notFound();
        const [resource] = await tx
          .insert(exampleResources)
          .values({
            organizationId,
            createdByMembershipId: membership.id,
            title: input.title,
            description: input.description ?? null,
          })
          .returning();
        if (!resource) throw new Error('Resource insert returned no row');
        return resource;
      },
    });
    return result.body;
  }

  async list(userId: string, organizationId: string, query: ResourceListQuery) {
    await this.permissions.assertPermission(
      userId,
      organizationId,
      'resources:read',
    );
    const context = {
      query: JSON.stringify({
        sort: query.sort,
        order: query.order,
        status: query.status ?? null,
        q: query.q ?? null,
      }),
      tenantId: organizationId,
    };
    let cursor: CursorValue | undefined;
    if (query.cursor) {
      try {
        cursor = cursorValueSchema(
          decodeCursor(query.cursor, context, this.cursorSecret),
        );
      } catch {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid or mismatched cursor',
        });
      }
    }
    const filters = [eq(exampleResources.organizationId, organizationId)];
    if (query.status) filters.push(eq(exampleResources.status, query.status));
    if (query.q) filters.push(ilike(exampleResources.title, `%${query.q}%`));
    if (cursor) {
      const time = new Date(cursor.createdAt);
      const compareTime = query.order === 'desc' ? lt : gt;
      const compareId = query.order === 'desc' ? lt : gt;
      filters.push(
        or(
          compareTime(exampleResources.createdAt, time),
          and(
            eq(exampleResources.createdAt, time),
            compareId(exampleResources.id, cursor.id),
          ),
        )!,
      );
    }
    const ordering =
      query.order === 'desc'
        ? [desc(exampleResources.createdAt), desc(exampleResources.id)]
        : [asc(exampleResources.createdAt), asc(exampleResources.id)];
    const rows = await this.db
      .select()
      .from(exampleResources)
      .where(and(...filters))
      .orderBy(...ordering)
      .limit(query.limit + 1);
    const hasNextPage = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map((item) => resourceResponseSchema.parse(item)),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeCursor(
                { createdAt: last.createdAt.toISOString(), id: last.id },
                context,
                this.cursorSecret,
              )
            : null,
      },
    };
  }

  async get(userId: string, organizationId: string, id: string) {
    const { resource } = await this.authorizedResource(
      userId,
      organizationId,
      id,
      'read',
    );
    return resourceResponseSchema.parse(resource);
  }

  async update(
    userId: string,
    organizationId: string,
    id: string,
    input: UpdateResourceInput,
  ) {
    await this.authorizedResource(userId, organizationId, id, 'update');
    const [updated] = await this.db
      .update(exampleResources)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(exampleResources.organizationId, organizationId),
          eq(exampleResources.id, id),
        ),
      )
      .returning();
    if (!updated) throw notFound();
    return resourceResponseSchema.parse(updated);
  }

  async delete(userId: string, organizationId: string, id: string) {
    await this.authorizedResource(userId, organizationId, id, 'delete');
    const [deleted] = await this.db
      .delete(exampleResources)
      .where(
        and(
          eq(exampleResources.organizationId, organizationId),
          eq(exampleResources.id, id),
        ),
      )
      .returning({ id: exampleResources.id });
    if (!deleted) throw notFound();
  }

  private async authorizedResource(
    userId: string,
    organizationId: string,
    id: string,
    action: ResourceAction,
  ) {
    await this.permissions.assertPermission(
      userId,
      organizationId,
      `resources:${action}`,
    );
    const [row] = await this.db
      .select({
        resource: exampleResources,
        membershipId: organizationMemberships.id,
        role: roles.key,
      })
      .from(exampleResources)
      .innerJoin(
        organizationMemberships,
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, 'active'),
        ),
      )
      .innerJoin(
        organizations,
        and(
          eq(organizations.id, organizationId),
          eq(organizations.status, 'active'),
        ),
      )
      .innerJoin(
        membershipRoles,
        eq(membershipRoles.membershipId, organizationMemberships.id),
      )
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .where(
        and(
          eq(exampleResources.organizationId, organizationId),
          eq(exampleResources.id, id),
        ),
      )
      .limit(1);
    if (!row) throw notFound();
    assertResourceAccess(
      row.role as OrganizationRole,
      action,
      row.membershipId,
      row.resource.createdByMembershipId,
    );
    return row;
  }
}
