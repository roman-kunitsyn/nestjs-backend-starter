export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  requestId: string;
  detail?: string;
  issues?: Array<{
    path: string[];
    code: string;
    message: string;
  }>;
}

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export function problemTitle(status: number): string {
  return TITLES[status] ?? 'Request Failed';
}

export function defaultProblemCode(status: number): string {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'RESOURCE_NOT_FOUND';
  if (status === 409) return 'RESOURCE_CONFLICT';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'RATE_LIMIT_EXCEEDED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return `HTTP_${status}`;
}
