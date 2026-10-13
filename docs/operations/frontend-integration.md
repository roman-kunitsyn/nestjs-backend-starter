# Frontend integration

Frontend applications generate types and a typed API client from an identified OpenAPI artifact. Record the backend release and source commit associated with the artifact. This repository does not contain a frontend, generated client, SDK package, or contract publication workflow.

Do not import backend Zod schemas, internal DTO classes, domain entities, or Drizzle types into a client. OpenAPI is the public, language-independent boundary.

## React, Vite, and TypeScript example

In the consumer repository, commit the reviewed OpenAPI artifact under `contracts/` and record its backend version and source SHA in `contracts/README.md`. Install tooling there and commit the lockfile so exact versions are reproducible:

```bash
pnpm add -D openapi-typescript
pnpm add openapi-fetch
```

Add to the consumer's `package.json` scripts:

```json
{
  "api:types": "openapi-typescript ./contracts/openapi.yaml -o ./src/api/generated.d.ts"
}
```

Then generate types:

```bash
pnpm api:types
```

Create `src/api/client.ts`:

```ts
import createClient from 'openapi-fetch';
import type { paths } from './generated';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: 'include',
});
```

Example usage (generated types define the exact query parameters and response):

```ts
const organizationId = '00000000-0000-4000-8000-000000000000';
const { data, error, response } = await api.GET(
  '/api/v1/organizations/{organizationId}/resources',
  {
    params: { path: { organizationId }, query: { limit: 20 } },
  },
});

if (!response.ok) {
  console.error(error); // Problem Details; data may be absent.
} else {
  console.log(data);
}
```

Follow documented browser cookie and CSRF protections. Vite `VITE_` values are public in the built bundle; never put secrets or access tokens there. On each contract update, replace the artifact from a known release/commit, regenerate, inspect type changes, run consumer typecheck and API tests, and review compatibility before deployment. Other generators such as Orval are optional and are not configured here.
