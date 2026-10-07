import { test, expect } from '@playwright/test';
import { loginUser, authHeaders } from '../helpers/auth-helper';

test.describe('Flow 6: Free Tier Onboarding — Website + Company Profile', () => {
  let token: string;
  let categoryId1: string;
  let categoryId2: string;

  test.beforeAll(async ({ request }) => {
    // Login with an existing test user
    const auth = await loginUser(request, 'pw-requester@e2e.com');
    token = auth.accessToken;
    
    // Fetch valid categories from the backend
    const catResponse = await request.get('/website-category-keys', { headers: authHeaders(token) });
    const catBody = await catResponse.json();
    const categories = catBody.data.filter((c: any) => c.enabled);
    categoryId1 = categories.find((c: any) => !c.parentId)?.id; // A primary category
    categoryId2 = categories.find((c: any) => c.parentId === categoryId1)?.id || categories[1]?.id; // A secondary category
    
    if (!categoryId1 || !categoryId2) {
      throw new Error("Could not find valid category IDs for test");
    }
  });

  test('POST /website + PATCH /user/update-profile — Strict Happy Path', async ({ request }) => {
    const uniqueUrl = `https://site-freetier-${Date.now()}.com`;
    
    // 1. Create the website
    const response = await request.post('/website', {
      headers: authHeaders(token),
      data: {
        name: 'Strict Onboarding Site',
        websiteUrl: uniqueUrl,
        industry: 'Technology',
        country: 'United States',
        marketplaceCategoryId: categoryId1,
        secondaryMarketplaceCategoryIds: [categoryId2],
      },
    });

    const body = await response.json();
    if (response.status() !== 201 && response.status() !== 200) {
      console.log('Error creating website:', body);
    }

    expect([200, 201]).toContain(response.status());
    expect(body.success).toBe(true);
    
    const savedCategories = body.data?.marketplaceCategories;
    expect(savedCategories).toBeDefined();
    expect(Array.isArray(savedCategories)).toBe(true);
    expect(savedCategories.length).toBeGreaterThanOrEqual(1);
    
    // 2. Immediately patch the profile (Simulating strict frontend flow)
    const profileRes = await request.patch('/user/update-profile', {
      headers: authHeaders(token),
      data: {
        companyName: 'Strict Onboarding Corp',
        businessType: 'CORPORATION',
      },
    });

    expect(profileRes.status()).toBe(200);
    const profileBody = await profileRes.json();
    expect(profileBody.success).toBe(true);
    expect(profileBody.data.companyName).toBe('Strict Onboarding Corp');
    expect(profileBody.data.businessType).toBe('CORPORATION');
  });

  test('GET /auth/me — Verify Persisted Profile', async ({ request }) => {
    const response = await request.get('/auth/me', {
      headers: authHeaders(token),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.companyName).toBe('Strict Onboarding Corp');
    expect(body.data.businessType).toBe('CORPORATION');
  });

  test('POST /website — Missing Required Fields (400)', async ({ request }) => {
    const response = await request.post('/website', {
      headers: authHeaders(token),
      data: {
        // Missing name and industry
        websiteUrl: 'https://invalid-site.com',
        country: 'US',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
