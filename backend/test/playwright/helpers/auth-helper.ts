import { APIRequestContext } from '@playwright/test';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  userId: string;
}

async function loginByEndpoint(
  request: APIRequestContext,
  endpoint: string,
  email: string,
  password = 'password123',
): Promise<AuthTokens> {
  const response = await request.post(endpoint, {
    data: { email, password },
  });

  const body = await response.json();
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }

  const data = body.data || body;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.user?.id || data.userId,
  };
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password = 'password123',
): Promise<AuthTokens> {
  return loginByEndpoint(request, '/auth/login', email, password);
}

export async function loginAdmin(
  request: APIRequestContext,
  email: string,
  password = 'password123',
): Promise<AuthTokens> {
  return loginByEndpoint(request, '/auth/admin-login', email, password);
}

export function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export async function getCurrentUser(
  request: APIRequestContext,
  accessToken: string,
) {
  const response = await request.get('/auth/me', {
    headers: authHeaders(accessToken),
  });

  const body = await response.json();
  if (!response.ok()) {
    throw new Error(`GET /auth/me failed: ${JSON.stringify(body)}`);
  }

  return body.data || body;
}
