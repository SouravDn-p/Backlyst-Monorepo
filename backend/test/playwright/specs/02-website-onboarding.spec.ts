import { test, expect } from '@playwright/test';
import { loginUser, authHeaders } from '../helpers/auth-helper';

test.describe('Flow 2: Website Onboarding & Verification', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const auth = await loginUser(request, 'pw-requester@e2e.com');
    token = auth.accessToken;
  });

  test('Add Website — Happy Path', async ({ request }) => {
    const uniqueUrl = `https://site-${Date.now()}.com`;
    const response = await request.post('/website', {
      headers: authHeaders(token),
      data: {
        name: 'New Test Site',
        websiteUrl: uniqueUrl,
        industry: 'Technology',
        country: 'US',
        marketplaceCategoryId: '3e49aa20-cc3a-4f9c-bf7d-b13d29f6b0af',
      },
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('Add Website — Edge Case: Duplicate Website URL (409)', async ({ request }) => {
    const response = await request.post('/website', {
      headers: authHeaders(token),
      data: {
        name: 'Duplicate Site',
        websiteUrl: 'https://pw-requester-site.com',
        industry: 'Technology',
        country: 'US',
      },
    });

    expect([400, 409]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
