import { test, expect } from '@playwright/test';
import { loginUser, authHeaders } from '../helpers/auth-helper';

test.describe('Flow 5: Direct Task Request (POST /task-request)', () => {
  let requesterToken: string;
  let providerToken: string;
  let requestId: string;
  let requesterWebsiteId: string;
  let providerWebsiteId: string;

  test.beforeAll(async ({ request }) => {
    const reqAuth = await loginUser(request, 'pw-requester@e2e.com');
    requesterToken = reqAuth.accessToken;

    const provAuth = await loginUser(request, 'pw-provider@e2e.com');
    providerToken = provAuth.accessToken;
  });

  test('1. Create Direct Task Request — Happy Path', async ({ request }) => {
    // Fetch verified websites
    const reqWebsitesRes = await request.get('/website/my-websites?verificationStatus=VERIFIED', {
      headers: authHeaders(requesterToken),
    });
    const reqWebsites = await reqWebsitesRes.json();
    const reqList = reqWebsites.data?.data || reqWebsites.data || reqWebsites;
    requesterWebsiteId = reqList[0]?.id;

    const provWebsitesRes = await request.get('/website/my-websites?verificationStatus=VERIFIED', {
      headers: authHeaders(providerToken),
    });
    const provWebsites = await provWebsitesRes.json();
    const provList = provWebsites.data?.data || provWebsites.data || provWebsites;
    providerWebsiteId = provList[0]?.id;
    const providerUserId = provList[0]?.author?.id || provList[0]?.authorId;

    if (!requesterWebsiteId || !providerWebsiteId) {
      test.skip();
      return;
    }

    const payload = {
      requesterWebsiteId,
      targetProviderId: providerUserId,
      projectTitle: 'Playwright Direct Campaign',
      targetUrl: 'https://pw-requester-site.com/target',
      anchorText: 'playwright testing',
      placementType: 'GUEST_POST',
      linkAttribute: 'DOFOLLOW',
      requestedDeadlineDays: 7,
      walletType: 'SUBSCRIPTION',
    };

    const response = await request.post('/task-request', {
      headers: {
        Authorization: `Bearer ${requesterToken}`,
      },
      multipart: {
        data: JSON.stringify(payload),
      },
    });

    if (response.status() !== 201) {
      console.log('TEST 1 ERROR BODY:', await response.text());
    }
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PENDING');
    requestId = body.data.id;
  });

  test('2. Get Received Task Requests — Provider View', async ({ request }) => {
    const response = await request.get('/task-request/received?status=PENDING', {
      headers: authHeaders(providerToken),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('3. Accept Direct Task Request — Provider Action', async ({ request }) => {
    if (!requestId) return;

    const response = await request.patch(`/task-request/${requestId}/accept`, {
      headers: authHeaders(providerToken),
      data: { providerWebsiteId },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.updatedRequest.status).toBe('ACCEPTED');
    expect(body.data.createdTask.lifecycleStatus).toBe('ASSIGNED');
  });

  test('4. Reject Direct Task Request — Edge Case (Already Accepted -> 400)', async ({ request }) => {
    if (!requestId) return;

    const response = await request.patch(`/task-request/${requestId}/reject`, {
      headers: authHeaders(providerToken),
      data: { rejectionReason: 'Cannot reject accepted request' },
    });

    expect([400, 403, 409]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
