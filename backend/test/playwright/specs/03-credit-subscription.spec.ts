import { test, expect } from '@playwright/test';
import { loginUser, authHeaders } from '../helpers/auth-helper';

test.describe('Flow 3: Credit Wallet & Subscription Management', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await loginUser(request, 'pw-requester@e2e.com');
    token = auth.accessToken;
  });

  test('Fetch Credit Wallet Balances — Happy Path', async ({ request }) => {
    const response = await request.get('/credits/me', {
      headers: authHeaders(token),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.subscriptionCredits).toBeDefined();
  });
});
