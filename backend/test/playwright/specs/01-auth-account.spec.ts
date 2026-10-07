import { test, expect } from '@playwright/test';
import { loginUser } from '../helpers/auth-helper';

test.describe('Flow 1: Authentication & User Account Management', () => {
  const testEmail = `user-${Date.now()}@e2e.com`;
  const testPassword = 'Password123!';

  test('User Registration — Happy Path', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: {
        name: 'Playwright Test User',
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('User Registration — Edge Case: Duplicate Email (400)', async ({ request }) => {
    const response = await request.post('/auth/register', {
      data: {
        name: 'Duplicate User',
        email: 'pw-requester@e2e.com',
        password: testPassword,
      },
    });

    expect([400, 409]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('User Login — Happy Path', async ({ request }) => {
    const tokens = await loginUser(request, 'pw-requester@e2e.com');
    expect(tokens.accessToken).toBeTruthy();
  });

  test('User Login — Edge Case: Invalid Password (401)', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'pw-requester@e2e.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
