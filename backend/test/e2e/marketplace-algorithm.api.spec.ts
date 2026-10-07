import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { AuthProvider, PrismaClient, UserStatus } from '@prisma/client';
import { MARKETPLACE_E2E_IDS } from '../marketplace-seed';
import { JwtService } from '@nestjs/jwt';
import { GoogleAuthService } from '../../src/modules/auth/google-auth.service';

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function loginOrFail(
  request: APIRequestContext,
  label: string,
  email: string,
  password = 'Password123!',
): Promise<string> {
  const response = await request.post('/auth/login', {
    data: {
      email,
      password,
    },
  });

  const rawBody = await response.text();

  expect(
    response.ok(),
    `${label} login failed with HTTP ${response.status()}: ${rawBody.slice(0, 500)}`,
  ).toBeTruthy();

  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `${label} login returned a non-JSON response: ${rawBody.slice(0, 500)}`,
    );
  }

  const token = body?.data?.accessToken ?? body?.accessToken;

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(
      `${label} login succeeded but no access token was returned.`,
    );
  }

  return token;
}

async function createMarketplaceTaskOrFail(
  request: APIRequestContext,
  requesterToken: string,
  label: string,
): Promise<any> {
  const response = await request.post('/task-requester', {
    headers: {
      Authorization: `Bearer ${requesterToken}`,
    },
    multipart: {
      data: JSON.stringify({
        requesterWebsiteId: MARKETPLACE_E2E_IDS.requesterWebsiteId,
        projectTitle: `${label} ${Date.now()}`,
        targetUrl: `https://requester-brand-e2e.test/${Date.now()}`,
        anchorText: 'marketplace opportunity test',
        placementGuidelines:
          'Deterministic E2E task used to verify marketplace matching.',
        placementType: 'GUEST_POST',
        linkAttribute: 'DOFOLLOW',
        requestedDeadlineDays: 7,
        walletType: 'SUBSCRIPTION',
      }),
    },
  });

  const rawBody = await response.text();

  expect(
    response.ok(),
    `${label} creation failed with HTTP ${response.status()}: ${rawBody.slice(0, 1000)}`,
  ).toBeTruthy();

  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error(
      `${label} creation returned non-JSON content: ${rawBody.slice(0, 1000)}`,
    );
  }

  const task = body?.data ?? body;

  if (typeof task?.id !== 'string' || task.id.length === 0) {
    throw new Error(
      `${label} creation response did not contain a task ID: ${rawBody.slice(0, 1000)}`,
    );
  }

  expect(task.lifecycleStatus).toBe('OPEN');

  return task;
}

function extractOpportunityItems(body: any): any[] {
  const candidates = [
    body?.data?.items,
    body?.data?.data?.items,
    body?.data?.data,
    body?.data,
    body?.items,
  ];

  return candidates.find(Array.isArray) ?? [];
}

function extractOpportunityAvailability(body: any): any {
  return (
    body?.data?.availability ??
    body?.data?.data?.availability ??
    body?.availability ??
    null
  );
}

interface PasswordLoginWorkflowOptions {
  testId: string;
  actorLabel: string;
  email: string;
  expectedName: string;
  expectedRole: 'ADMIN' | 'USER';
}

async function assertPasswordLoginWorkflow(
  request: APIRequestContext,
  {
    testId,
    actorLabel,
    email,
    expectedName,
    expectedRole,
  }: PasswordLoginWorkflowOptions,
): Promise<void> {
  const password = 'Password123!';
  const userAgent = `Backlyst-Marketplace-E2E/${testId}-${Date.now()}`;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  const activeSessionsBefore = await prisma.session.count({
    where: {
      userId: user.id,
      logoutAt: null,
    },
  });

  const loginResponse = await request.post('/auth/login', {
    headers: {
      'user-agent': userAgent,
    },
    data: {
      email,
      password,
    },
  });

  const loginBody = await loginResponse.json();

  expect(
    loginResponse.status(),
    `${actorLabel} login returned ${loginResponse.status()}.`,
  ).toBe(201);

  expect(loginBody).toMatchObject({
    success: true,
    message: 'User logged in successfully',
    data: {
      accessToken: expect.any(String),
    },
  });

  const accessToken = loginBody?.data?.accessToken;

  expect(typeof accessToken).toBe('string');
  expect(accessToken.length).toBeGreaterThan(0);

  const activeSessionsAfter = await prisma.session.count({
    where: {
      userId: user.id,
      logoutAt: null,
    },
  });

  expect(activeSessionsAfter).toBe(activeSessionsBefore + 1);

  const createdSession = await prisma.session.findFirst({
    where: {
      userId: user.id,
      logoutAt: null,
      userAgent,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      device: true,
      loginAt: true,
      logoutAt: true,
    },
  });

  expect(createdSession).not.toBeNull();

  if (!createdSession) {
    throw new Error(
      `${actorLabel} login succeeded without persisting a session.`,
    );
  }

  expect(createdSession).toMatchObject({
    userAgent,
    logoutAt: null,
  });
  expect(createdSession.ipAddress.length).toBeGreaterThan(0);
  expect(createdSession.device.length).toBeGreaterThan(0);
  expect(createdSession.loginAt).toBeInstanceOf(Date);

  const meResponse = await request.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const meBody = await meResponse.json();

  expect(meResponse.status()).toBe(200);
  expect(meBody).toMatchObject({
    success: true,
    message: 'User Information Fetched Successfully',
    data: {
      email,
      name: expectedName,
      role: expectedRole,
      status: 'ACTIVE',
      sessions: expect.any(Array),
    },
  });

  const meData = meBody.data;

  expect(meData.sessions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createdSession.id,
        userAgent,
        logoutAt: null,
      }),
    ]),
  );

  for (const sensitiveField of [
    'password',
    'isDeleted',
    'isVerified',
    'registrationTime',
    'createdAt',
    'updatedAt',
    'punishmentReason',
    'suspendStart',
    'suspendEnd',
  ]) {
    expect(meData).not.toHaveProperty(sensitiveField);
  }

  const sessionsBeforeInvalidPassword = await prisma.session.count({
    where: {
      userId: user.id,
    },
  });

  const invalidLoginResponse = await request.post('/auth/login', {
    headers: {
      'user-agent': `${userAgent}-invalid-password`,
    },
    data: {
      email,
      password: 'DefinitelyWrongPassword!',
    },
  });

  const invalidLoginBody = await invalidLoginResponse.text();

  expect(invalidLoginResponse.status()).toBe(401);
  expect(invalidLoginBody).toContain('Invalid Credentials');

  const sessionsAfterInvalidPassword = await prisma.session.count({
    where: {
      userId: user.id,
    },
  });

  expect(sessionsAfterInvalidPassword).toBe(sessionsBeforeInvalidPassword);
}

test.describe('Backlyst Marketplace Algorithm - API Test Suite', () => {
  let requesterToken: string;
  let activeProviderToken: string;
  let restrictedProviderToken: string;

  test.beforeAll(async ({ request }) => {
    requesterToken = await loginOrFail(
      request,
      'Requester',
      'requester.e2e@backlyst.test',
    );

    activeProviderToken = await loginOrFail(
      request,
      'Active provider',
      'provider.active.e2e@backlyst.test',
    );

    restrictedProviderToken = await loginOrFail(
      request,
      'Restricted provider',
      'provider.restricted.e2e@backlyst.test',
    );
  });

  test('1. Endpoint Discovery & Access Control - Unauthenticated requests blocked', async ({
    request,
  }) => {
    const res = await request.get('/provider-task/opportunities');
    expect(res.status()).toBe(401);
  });

  test('2. Provider Opportunity Fetching - Active Provider receives opportunity listings', async ({
    request,
  }) => {
    const createdTask = await createMarketplaceTaskOrFail(
      request,
      requesterToken,
      'E2E Active Provider Opportunity',
    );

    const response = await request.get(
      '/provider-task/opportunities?page=1&limit=50',
      {
        headers: {
          Authorization: `Bearer ${activeProviderToken}`,
        },
      },
    );

    const rawBody = await response.text();

    expect(
      response.ok(),
      `Active-provider opportunities failed with HTTP ${response.status()}: ${rawBody.slice(0, 1000)}`,
    ).toBeTruthy();

    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `Active-provider opportunities returned non-JSON content: ${rawBody.slice(0, 1000)}`,
      );
    }

    const items = extractOpportunityItems(body);
    const availability = extractOpportunityAvailability(body);

    expect(Array.isArray(items)).toBeTruthy();

    const matchedTask = items.find((item: any) => item?.id === createdTask.id);

    expect(
      matchedTask,
      `Created task ${createdTask.id} was not returned to the active provider.`,
    ).toBeDefined();

    expect(matchedTask.requesterWebsiteId).toBe(
      MARKETPLACE_E2E_IDS.requesterWebsiteId,
    );

    expect(availability).toMatchObject({
      available: true,
      userSafeStatusCode: 'OK',
      retrySuggested: false,
      selectedProviderWebsiteId: MARKETPLACE_E2E_IDS.activeProviderWebsiteId,
    });

    expect(typeof availability.relaxationLevel).toBe('number');
  });

  test('3. Marketplace Algorithm Suppression Rules - Restricted Profile filtering', async ({
    request,
  }) => {
    const createdTask = await createMarketplaceTaskOrFail(
      request,
      requesterToken,
      'E2E Restricted Provider Suppression',
    );

    const response = await request.get(
      '/provider-task/opportunities?page=1&limit=50',
      {
        headers: {
          Authorization: `Bearer ${restrictedProviderToken}`,
        },
      },
    );

    const rawBody = await response.text();

    expect(
      response.ok(),
      `Restricted-provider opportunities failed with HTTP ${response.status()}: ${rawBody.slice(0, 1000)}`,
    ).toBeTruthy();

    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `Restricted-provider opportunities returned non-JSON content: ${rawBody.slice(0, 1000)}`,
      );
    }

    const items = extractOpportunityItems(body);
    const availability = extractOpportunityAvailability(body);

    expect(Array.isArray(items)).toBeTruthy();
    expect(items).toHaveLength(0);

    expect(
      items.some((item: any) => item?.id === createdTask.id),
      `Restricted provider unexpectedly received task ${createdTask.id}.`,
    ).toBeFalsy();

    expect(availability).toMatchObject({
      available: false,
      fallbackUsed: false,
      relaxationLevel: 0,
      userSafeStatusCode: 'ACCOUNT_RESTRICTED',
      retrySuggested: false,
      selectedProviderWebsiteId: null,
    });
  });
  test('4. Task Creation Payload Validation & Credit Requirements', async ({
    request,
  }) => {
    const invalidResponse = await request.post('/task-requester', {
      headers: {
        Authorization: `Bearer ${requesterToken}`,
      },
      multipart: {
        data: JSON.stringify({
          projectTitle: 'E2E Invalid Task',
        }),
      },
    });

    expect([400, 422]).toContain(invalidResponse.status());

    const requesterWebsiteId = MARKETPLACE_E2E_IDS.requesterWebsiteId;

    const walletBefore = await prisma.websiteCreditWallet.findUniqueOrThrow({
      where: {
        websiteId: requesterWebsiteId,
      },
      select: {
        subscriptionTaskCredits: true,
      },
    });

    const createdTask = await createMarketplaceTaskOrFail(
      request,
      requesterToken,
      'E2E Credit Deduction',
    );

    const reservedCreditAmount = createdTask.reservedCreditAmount;

    expect(Number.isInteger(reservedCreditAmount)).toBeTruthy();
    expect(reservedCreditAmount).toBeGreaterThan(0);

    const [walletAfter, spendLog] = await Promise.all([
      prisma.websiteCreditWallet.findUniqueOrThrow({
        where: {
          websiteId: requesterWebsiteId,
        },
        select: {
          subscriptionTaskCredits: true,
        },
      }),
      prisma.creditLog.findFirst({
        where: {
          taskId: createdTask.id,
          websiteId: requesterWebsiteId,
          action: 'SPEND',
          reason: 'TASK_POST',
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    expect(walletAfter.subscriptionTaskCredits).toBe(
      walletBefore.subscriptionTaskCredits - reservedCreditAmount,
    );

    expect(spendLog).not.toBeNull();

    expect(spendLog).toMatchObject({
      taskId: createdTask.id,
      websiteId: requesterWebsiteId,
      action: 'SPEND',
      reason: 'TASK_POST',
      amount: reservedCreditAmount,
      balanceBefore: walletBefore.subscriptionTaskCredits,
      balanceAfter: walletAfter.subscriptionTaskCredits,
    });

    const balanceToRestore = walletAfter.subscriptionTaskCredits;
    const failureNonce = Date.now();
    const failureTitle = `E2E Insufficient Credit Rollback ${failureNonce}`;

    const [taskCountBefore, taskFlowCountBefore, creditLogCountBefore] =
      await Promise.all([
        prisma.placementTask.count(),
        prisma.taskFlow.count(),
        prisma.creditLog.count(),
      ]);

    await prisma.websiteCreditWallet.update({
      where: {
        websiteId: requesterWebsiteId,
      },
      data: {
        subscriptionTaskCredits: 0,
      },
    });

    try {
      const failedResponse = await request.post('/task-requester', {
        headers: {
          Authorization: `Bearer ${requesterToken}`,
        },
        multipart: {
          data: JSON.stringify({
            requesterWebsiteId,
            projectTitle: failureTitle,
            targetUrl: `https://requester-brand-e2e.test/insufficient-${failureNonce}`,
            anchorText: 'insufficient credit rollback',
            placementGuidelines:
              'This task must be removed after credit deduction fails.',
            placementType: 'GUEST_POST',
            linkAttribute: 'DOFOLLOW',
            requestedDeadlineDays: 7,
            walletType: 'SUBSCRIPTION',
          }),
        },
      });

      const failedRawBody = await failedResponse.text();

      expect(failedResponse.status()).toBe(400);
      expect(failedRawBody).toContain(
        'Insufficient subscription task credits.',
      );

      const [
        failedTask,
        taskCountAfter,
        taskFlowCountAfter,
        creditLogCountAfter,
        emptyWallet,
      ] = await Promise.all([
        prisma.placementTask.findFirst({
          where: {
            projectTitle: failureTitle,
          },
        }),
        prisma.placementTask.count(),
        prisma.taskFlow.count(),
        prisma.creditLog.count(),
        prisma.websiteCreditWallet.findUniqueOrThrow({
          where: {
            websiteId: requesterWebsiteId,
          },
          select: {
            subscriptionTaskCredits: true,
          },
        }),
      ]);

      expect(failedTask).toBeNull();
      expect(taskCountAfter).toBe(taskCountBefore);
      expect(taskFlowCountAfter).toBe(taskFlowCountBefore);
      expect(creditLogCountAfter).toBe(creditLogCountBefore);
      expect(emptyWallet.subscriptionTaskCredits).toBe(0);
    } finally {
      await prisma.websiteCreditWallet.update({
        where: {
          websiteId: requesterWebsiteId,
        },
        data: {
          subscriptionTaskCredits: balanceToRestore,
        },
      });
    }
  });

  test('5. Real Concurrency & Duplicate Action Protection - Concurrent Application', async ({
    request,
  }) => {
    const createResponse = await request.post('/task-requester', {
      headers: {
        Authorization: `Bearer ${requesterToken}`,
      },
      multipart: {
        data: JSON.stringify({
          requesterWebsiteId: MARKETPLACE_E2E_IDS.requesterWebsiteId,
          projectTitle: `E2E Concurrent Application ${Date.now()}`,
          targetUrl:
            'https://requester-brand-e2e.test/concurrent-application-target',
          anchorText: 'marketplace concurrency test',
          placementGuidelines:
            'Deterministic E2E task used to verify duplicate application protection.',
          country: 'US',
          language: 'en',
          placementType: 'GUEST_POST',
          linkAttribute: 'DOFOLLOW',
          requestedDeadlineDays: 7,
          walletType: 'SUBSCRIPTION',
        }),
      },
    });

    const createRawBody = await createResponse.text();

    expect(
      createResponse.ok(),
      `Task creation failed with HTTP ${createResponse.status()}: ${createRawBody.slice(0, 1000)}`,
    ).toBeTruthy();

    let createBody: any;

    try {
      createBody = JSON.parse(createRawBody);
    } catch {
      throw new Error(
        `Task creation returned non-JSON content: ${createRawBody.slice(0, 1000)}`,
      );
    }

    const task = createBody?.data ?? createBody;
    const taskId = task?.id;

    expect(
      typeof taskId === 'string' && taskId.length > 0,
      `Task creation response did not contain a task ID: ${createRawBody.slice(0, 1000)}`,
    ).toBeTruthy();

    expect(task.lifecycleStatus).toBe('OPEN');

    const responses = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        request.post(`/provider-task/${taskId}/apply`, {
          headers: {
            Authorization: `Bearer ${activeProviderToken}`,
          },
          data: {
            providerWebsiteId: MARKETPLACE_E2E_IDS.activeProviderWebsiteId,
            note: `Concurrent application request ${index + 1}`,
          },
        }),
      ),
    );

    const statuses = responses.map((response) => response.status());

    console.log(`CONCURRENT_APPLICATION_STATUSES=${statuses.join(',')}`);

    expect(
      statuses.filter((status) => status === 201),
      `Expected exactly one successful application, received: ${statuses.join(',')}`,
    ).toHaveLength(1);

    expect(
      statuses.filter((status) => status === 400),
      `Expected two duplicate rejections, received: ${statuses.join(',')}`,
    ).toHaveLength(2);

    const applicantsResponse = await request.get(
      `/task-requester/${taskId}/applicants?limit=10`,
      {
        headers: {
          Authorization: `Bearer ${requesterToken}`,
        },
      },
    );

    const applicantsRawBody = await applicantsResponse.text();

    expect(
      applicantsResponse.ok(),
      `Applicant retrieval failed with HTTP ${applicantsResponse.status()}: ${applicantsRawBody.slice(0, 1000)}`,
    ).toBeTruthy();

    const applicantsBody: any = JSON.parse(applicantsRawBody);

    const applicantItems =
      applicantsBody?.data?.items ??
      applicantsBody?.data?.data ??
      applicantsBody?.data ??
      applicantsBody?.items ??
      [];

    expect(Array.isArray(applicantItems)).toBeTruthy();

    const activeProviderApplications = applicantItems.filter(
      (application: any) =>
        application.providerWebsiteId ===
        MARKETPLACE_E2E_IDS.activeProviderWebsiteId,
    );

    expect(activeProviderApplications).toHaveLength(1);
  });
  test('6. TC-WF-001 Provider Password Login & Current User Contract', async ({
    request,
  }) => {
    await assertPasswordLoginWorkflow(request, {
      testId: 'TC-WF-001',
      actorLabel: 'Provider',
      email: 'provider.active.e2e@backlyst.test',
      expectedName: 'Active E2E Provider',
      expectedRole: 'USER',
    });
  });

  test('7. TC-WF-002 Requester Password Login & Current User Contract', async ({
    request,
  }) => {
    await assertPasswordLoginWorkflow(request, {
      testId: 'TC-WF-002',
      actorLabel: 'Requester',
      email: 'requester.e2e@backlyst.test',
      expectedName: 'E2E Test Requester',
      expectedRole: 'USER',
    });
  });
  test('8. TC-WF-003 Administrator Password Login & Current User Contract', async ({
    request,
  }) => {
    await assertPasswordLoginWorkflow(request, {
      testId: 'TC-WF-003',
      actorLabel: 'Administrator',
      email: 'admin.e2e@backlyst.test',
      expectedName: 'E2E Test Administrator',
      expectedRole: 'ADMIN',
    });
  });
  test('9. TC-WF-004 Logout Authenticated Actor', async ({ request }) => {
    const email = 'provider.active.e2e@backlyst.test';
    const userAgent = `Backlyst-Marketplace-E2E/TC-WF-004-${Date.now()}`;

    const provider = await prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    const activeSessionsBefore = await prisma.session.count({
      where: {
        userId: provider.id,
        logoutAt: null,
      },
    });

    const loginResponse = await request.post('/auth/login', {
      headers: {
        'user-agent': userAgent,
      },
      data: {
        email,
        password: 'Password123!',
      },
    });

    const loginBody = await loginResponse.json();

    expect(loginResponse.status()).toBe(201);
    expect(loginBody).toMatchObject({
      success: true,
      message: 'User logged in successfully',
      data: {
        accessToken: expect.any(String),
      },
    });

    const logoutToken = loginBody?.data?.accessToken;

    expect(typeof logoutToken).toBe('string');
    expect(logoutToken.length).toBeGreaterThan(0);

    const session = await prisma.session.findFirst({
      where: {
        userId: provider.id,
        userAgent,
        logoutAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        logoutAt: true,
      },
    });

    expect(session).not.toBeNull();

    if (!session) {
      throw new Error(
        'TC-WF-004 login did not create the expected active session.',
      );
    }

    const activeSessionsAfterLogin = await prisma.session.count({
      where: {
        userId: provider.id,
        logoutAt: null,
      },
    });

    expect(activeSessionsAfterLogin).toBe(activeSessionsBefore + 1);

    const logoutResponse = await request.post('/auth/logout', {
      headers: {
        Authorization: `Bearer ${logoutToken}`,
      },
    });

    const logoutBody = await logoutResponse.json();

    expect(logoutResponse.status()).toBe(201);
    expect(logoutBody).toEqual({
      success: true,
      message: 'Logged out successfully',
    });

    const loggedOutSession = await prisma.session.findUniqueOrThrow({
      where: {
        id: session.id,
      },
      select: {
        userId: true,
        logoutAt: true,
      },
    });

    expect(loggedOutSession.userId).toBe(provider.id);
    expect(loggedOutSession.logoutAt).toBeInstanceOf(Date);

    const activeSessionsAfterLogout = await prisma.session.count({
      where: {
        userId: provider.id,
        logoutAt: null,
      },
    });

    expect(activeSessionsAfterLogout).toBe(activeSessionsBefore);

    const expiredTokenResponse = await request.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${logoutToken}`,
      },
    });

    const expiredTokenBody = await expiredTokenResponse.text();

    expect(expiredTokenResponse.status()).toBe(401);
    expect(expiredTokenBody).toContain('Session expired');

    const existingSessionResponse = await request.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${activeProviderToken}`,
      },
    });

    expect(existingSessionResponse.status()).toBe(200);
  });
  test('10. TC-WF-005 Admin Creates Fixed User', async ({ request }) => {
    const fixedUser = {
      name: 'E2E Fixed Administrator',
      email: 'fixed.admin.e2e@backlyst.test',
      password: 'FixedPassword123!',
      role: 'ADMIN',
    };

    const existingUser = await prisma.user.findUnique({
      where: {
        email: fixedUser.email,
      },
    });

    expect(existingUser).toBeNull();

    const usersBefore = await prisma.user.count();
    const walletsBefore = await prisma.userCreditWallet.count();

    const unauthenticatedResponse = await request.post(
      '/auth/admin-create-user',
      {
        data: fixedUser,
      },
    );

    expect(unauthenticatedResponse.status()).toBe(401);

    expect(
      await prisma.user.findUnique({
        where: {
          email: fixedUser.email,
        },
      }),
    ).toBeNull();

    const nonAdminResponse = await request.post('/auth/admin-create-user', {
      headers: {
        Authorization: `Bearer ${activeProviderToken}`,
      },
      data: fixedUser,
    });

    expect(nonAdminResponse.status()).toBe(403);

    expect(
      await prisma.user.findUnique({
        where: {
          email: fixedUser.email,
        },
      }),
    ).toBeNull();

    const adminToken = await loginOrFail(
      request,
      'Administrator',
      'admin.e2e@backlyst.test',
    );

    const createResponse = await request.post('/auth/admin-create-user', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      data: fixedUser,
    });

    const createRawBody = await createResponse.text();

    expect(
      createResponse.status(),
      `Admin create-user failed with HTTP ${createResponse.status()}: ${createRawBody.slice(0, 500)}`,
    ).toBe(201);

    let createBody: any;

    try {
      createBody = JSON.parse(createRawBody);
    } catch {
      throw new Error(
        `Admin create-user returned non-JSON: ${createRawBody.slice(0, 500)}`,
      );
    }

    expect(createBody).toMatchObject({
      success: true,
      message: 'User Registration Successfully, User can login now.',
      data: {
        result: {
          name: fixedUser.name,
          email: fixedUser.email,
          status: 'ACTIVE',
          isVerified: true,
        },
      },
    });

    const responseUser = createBody?.data?.result;

    expect(responseUser).toBeTruthy();

    // These soft assertions intentionally expose the current source defects
    // while allowing the remainder of the persistence contract to run.
    expect.soft(responseUser?.role).toBe('ADMIN');
    expect.soft(responseUser).not.toHaveProperty('password');

    const persistedUser = await prisma.user.findUnique({
      where: {
        email: fixedUser.email,
      },
      include: {
        creditWallet: true,
      },
    });

    expect(persistedUser).not.toBeNull();

    if (!persistedUser) {
      throw new Error(
        'Admin create-user returned success without persisting the user.',
      );
    }

    expect(persistedUser).toMatchObject({
      name: fixedUser.name,
      email: fixedUser.email,
      status: 'ACTIVE',
      isVerified: true,
      isDeleted: false,
    });

    expect.soft(persistedUser.role).toBe('ADMIN');

    expect(persistedUser.password).toEqual(expect.any(String));
    expect(persistedUser.password).not.toBe(fixedUser.password);

    expect(persistedUser.creditWallet).toMatchObject({
      subscriptionTaskCredits: 0,
      earnedTaskCredits: 0,
      purchasedTaskCredits: 0,
      referralTaskCredits: 0,
      visibilityCredits: 0,
    });

    expect(await prisma.user.count()).toBe(usersBefore + 1);
    expect(await prisma.userCreditWallet.count()).toBe(walletsBefore + 1);

    const fixedUserToken = await loginOrFail(
      request,
      'Admin-created fixed user',
      fixedUser.email,
      fixedUser.password,
    );

    const meResponse = await request.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${fixedUserToken}`,
      },
    });

    const meBody = await meResponse.json();

    expect(meResponse.status()).toBe(200);
    expect(meBody).toMatchObject({
      success: true,
      data: {
        name: fixedUser.name,
        email: fixedUser.email,
        status: 'ACTIVE',
      },
    });

    expect.soft(meBody?.data?.role).toBe('ADMIN');
    expect(meBody?.data).not.toHaveProperty('password');

    const duplicateResponse = await request.post('/auth/admin-create-user', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      data: fixedUser,
    });

    const duplicateBody = await duplicateResponse.text();

    expect(duplicateResponse.status()).toBe(409);
    expect(duplicateBody).toContain('User already exist');

    expect(await prisma.user.count()).toBe(usersBefore + 1);
    expect(await prisma.userCreditWallet.count()).toBe(walletsBefore + 1);

    const persistedDuplicates = await prisma.user.count({
      where: {
        email: fixedUser.email,
      },
    });

    expect(persistedDuplicates).toBe(1);
  });

  test('11. TC-WF-006 Public Registration Conflict Verification', async ({
    request,
  }) => {
    const publicRegistrationUser = {
      name: 'E2E Public Registration Conflict',
      email: 'public.registration.e2e@backlyst.test',
      password: 'PublicRegistration123!',
    };

    const usersBefore = await prisma.user.count();
    const walletsBefore = await prisma.userCreditWallet.count();
    const otpTokensBefore = await prisma.otpToken.count();

    expect(
      await prisma.user.findUnique({
        where: {
          email: publicRegistrationUser.email,
        },
      }),
    ).toBeNull();

    expect(
      await prisma.otpToken.count({
        where: {
          email: publicRegistrationUser.email,
          type: 'EMAIL_VERIFICATION',
        },
      }),
    ).toBe(0);

    const registerResponse = await request.post('/auth/register', {
      data: publicRegistrationUser,
    });

    const registerRawBody = await registerResponse.text();

    const userAfterRegister = await prisma.user.findUnique({
      where: {
        email: publicRegistrationUser.email,
      },
      include: {
        creditWallet: true,
      },
    });

    const otpTokensAfterRegister = await prisma.otpToken.count({
      where: {
        email: publicRegistrationUser.email,
        type: 'EMAIL_VERIFICATION',
      },
    });

    console.log(
      `PUBLIC_REGISTRATION_REGISTER_STATUS=${registerResponse.status()}`,
    );
    console.log(
      `PUBLIC_REGISTRATION_USER_CREATED=${userAfterRegister !== null}`,
    );
    console.log(`PUBLIC_REGISTRATION_OTP_COUNT=${otpTokensAfterRegister}`);

    expect
      .soft(
        registerResponse.status(),
        [
          'Public self-registration is reachable despite the fixed-user requirement.',
          `HTTP ${registerResponse.status()}: ${registerRawBody.slice(0, 500)}`,
        ].join(' '),
      )
      .toBe(404);

    expect
      .soft(
        userAfterRegister === null,
        'Public registration created a user record.',
      )
      .toBe(true);

    expect
      .soft(
        userAfterRegister?.creditWallet ?? null,
        'Public registration created a user credit wallet.',
      )
      .toBeNull();

    expect
      .soft(
        otpTokensAfterRegister,
        'Public registration created an email-verification OTP.',
      )
      .toBe(0);

    const verifyResponse = await request.post('/auth/verify-register-otp', {
      data: {
        email: publicRegistrationUser.email,
        otp: '000000',
      },
    });

    const verifyRawBody = await verifyResponse.text();

    console.log(`PUBLIC_REGISTRATION_VERIFY_STATUS=${verifyResponse.status()}`);

    expect
      .soft(
        verifyResponse.status(),
        [
          'Public registration OTP verification is reachable despite the fixed-user requirement.',
          `HTTP ${verifyResponse.status()}: ${verifyRawBody.slice(0, 500)}`,
        ].join(' '),
      )
      .toBe(404);

    expect.soft(await prisma.user.count()).toBe(usersBefore);
    expect.soft(await prisma.userCreditWallet.count()).toBe(walletsBefore);
    expect.soft(await prisma.otpToken.count()).toBe(otpTokensBefore);

    expect(
      await prisma.user.findUnique({
        where: {
          email: publicRegistrationUser.email,
        },
      }),
    ).toBeNull();

    expect(
      await prisma.otpToken.count({
        where: {
          email: publicRegistrationUser.email,
          type: 'EMAIL_VERIFICATION',
        },
      }),
    ).toBe(0);
  });

  test('12. TC-WF-007 Google Authentication Fixed-User Policy (Local Contract)', async ({
    request,
  }) => {
    const fixedUserEmail = 'requester.e2e@backlyst.test';
    const fixedProviderId = 'google-e2e-fixed-requester';
    const unknownEmail = 'google.unknown.e2e@backlyst.test';
    const userAgent = `Backlyst-Marketplace-E2E/TC-WF-007-${Date.now()}`;

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required for TC-WF-007 local coverage.');
    }

    const jwtService = new JwtService({
      secret: jwtSecret,
    });

    const googleAuthService = new GoogleAuthService(
      prisma as any,
      {
        generateSessionInfo: () => ({
          ip: '127.0.0.1',
          device: 'Desktop (E2E)',
          userAgent,
        }),
        generateJwtToken: (payload: Record<string, unknown>) =>
          jwtService.sign(payload, {
            expiresIn: '10d',
          }),
      } as any,
    );

    const fixedUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: fixedUserEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        isDeleted: true,
        status: true,
      },
    });

    expect(fixedUser).toMatchObject({
      email: fixedUserEmail,
      isVerified: true,
      isDeleted: false,
      status: UserStatus.ACTIVE,
    });

    const negativeUsers = [
      {
        name: 'E2E Google Unverified User',
        email: 'google.unverified.e2e@backlyst.test',
        isVerified: false,
        isDeleted: false,
        status: UserStatus.NOT_VERIFIED,
        expectedError: 'User not verified, Please verify your account first.',
      },
      {
        name: 'E2E Google Suspended User',
        email: 'google.suspended.e2e@backlyst.test',
        isVerified: true,
        isDeleted: false,
        status: UserStatus.SUSPENDED,
        expectedError: 'User is not active',
      },
      {
        name: 'E2E Google Deleted User',
        email: 'google.deleted.e2e@backlyst.test',
        isVerified: true,
        isDeleted: true,
        status: UserStatus.DELETED,
        expectedError: 'Invalid Credentials',
      },
    ];

    const temporaryEmails = negativeUsers.map((user) => user.email);

    const cleanupTemporaryUsers = async () => {
      const temporaryUsers = await prisma.user.findMany({
        where: {
          email: {
            in: temporaryEmails,
          },
        },
        select: {
          id: true,
        },
      });

      const temporaryUserIds = temporaryUsers.map((user) => user.id);

      if (temporaryUserIds.length > 0) {
        await prisma.session.deleteMany({
          where: {
            userId: {
              in: temporaryUserIds,
            },
          },
        });

        await prisma.authProviderAccount.deleteMany({
          where: {
            userId: {
              in: temporaryUserIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: temporaryUserIds,
            },
          },
        });
      }
    };

    await cleanupTemporaryUsers();

    await prisma.authProviderAccount.deleteMany({
      where: {
        provider: AuthProvider.GOOGLE,
        providerId: fixedProviderId,
      },
    });

    await prisma.session.deleteMany({
      where: {
        userId: fixedUser.id,
        userAgent,
      },
    });

    try {
      const initiationResponse = await request.get('/auth/google', {
        maxRedirects: 0,
      });

      const initiationLocation = initiationResponse.headers()['location'] ?? '';

      console.log(
        `GOOGLE_OAUTH_INITIATION_STATUS=${initiationResponse.status()}`,
      );

      expect(initiationResponse.status()).toBe(302);
      expect(initiationLocation).toContain('accounts.google.com');

      const usersBeforeUnknownLogin = await prisma.user.count();
      const walletsBeforeUnknownLogin = await prisma.userCreditWallet.count();
      const providerAccountsBeforeUnknownLogin =
        await prisma.authProviderAccount.count();
      const sessionsBeforeUnknownLogin = await prisma.session.count();

      await expect(
        googleAuthService.googleLogin(
          {
            email: unknownEmail,
            firstName: 'Unknown',
            lastName: 'Google User',
            provider: 'GOOGLE',
            providerId: 'google-e2e-unknown-user',
          },
          {} as any,
        ),
      ).rejects.toThrow('Invalid Credentials');

      expect(
        await prisma.user.findUnique({
          where: {
            email: unknownEmail,
          },
        }),
      ).toBeNull();

      expect(await prisma.user.count()).toBe(usersBeforeUnknownLogin);
      expect(await prisma.userCreditWallet.count()).toBe(
        walletsBeforeUnknownLogin,
      );
      expect(await prisma.authProviderAccount.count()).toBe(
        providerAccountsBeforeUnknownLogin,
      );
      expect(await prisma.session.count()).toBe(sessionsBeforeUnknownLogin);

      await prisma.user.createMany({
        data: negativeUsers.map(
          ({ expectedError: _expectedError, ...user }) => user,
        ),
      });

      for (const [index, negativeUser] of negativeUsers.entries()) {
        const providerId = `google-e2e-negative-${index + 1}`;

        const negativeUserRecord = await prisma.user.findUniqueOrThrow({
          where: {
            email: negativeUser.email,
          },
          select: {
            id: true,
          },
        });

        const sessionsBeforeRejectedLogin = await prisma.session.count({
          where: {
            userId: negativeUserRecord.id,
          },
        });

        await expect(
          googleAuthService.googleLogin(
            {
              email: negativeUser.email,
              firstName: 'Rejected',
              lastName: 'Google User',
              provider: 'GOOGLE',
              providerId,
            },
            {} as any,
          ),
        ).rejects.toThrow(negativeUser.expectedError);

        expect(
          await prisma.authProviderAccount.count({
            where: {
              provider: AuthProvider.GOOGLE,
              providerId,
            },
          }),
        ).toBe(0);

        expect(
          await prisma.session.count({
            where: {
              userId: negativeUserRecord.id,
            },
          }),
        ).toBe(sessionsBeforeRejectedLogin);
      }

      const usersBeforeFixedLogin = await prisma.user.count();
      const walletsBeforeFixedLogin = await prisma.userCreditWallet.count();
      const providerAccountsBeforeFixedLogin =
        await prisma.authProviderAccount.count();
      const sessionsBeforeFixedLogin = await prisma.session.count({
        where: {
          userId: fixedUser.id,
        },
      });

      const accessToken = await googleAuthService.googleLogin(
        {
          email: fixedUser.email,
          firstName: 'E2E Test',
          lastName: 'Requester',
          provider: 'GOOGLE',
          providerId: fixedProviderId,
        },
        {} as any,
      );

      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(0);

      expect(await prisma.user.count()).toBe(usersBeforeFixedLogin);
      expect(await prisma.userCreditWallet.count()).toBe(
        walletsBeforeFixedLogin,
      );

      expect(await prisma.authProviderAccount.count()).toBe(
        providerAccountsBeforeFixedLogin + 1,
      );

      const providerAccount =
        await prisma.authProviderAccount.findUniqueOrThrow({
          where: {
            provider_providerId: {
              provider: AuthProvider.GOOGLE,
              providerId: fixedProviderId,
            },
          },
        });

      expect(providerAccount.userId).toBe(fixedUser.id);

      expect(
        await prisma.session.count({
          where: {
            userId: fixedUser.id,
          },
        }),
      ).toBe(sessionsBeforeFixedLogin + 1);

      const createdSession = await prisma.session.findFirst({
        where: {
          userId: fixedUser.id,
          userAgent,
          logoutAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(createdSession).not.toBeNull();

      const meResponse = await request.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const meBody = await meResponse.json();

      expect(meResponse.status()).toBe(200);
      expect(meBody).toMatchObject({
        success: true,
        message: 'User Information Fetched Successfully',
        data: {
          id: fixedUser.id,
          email: fixedUser.email,
          name: fixedUser.name,
          role: fixedUser.role,
          status: UserStatus.ACTIVE,
        },
      });

      console.log('GOOGLE_FIXED_USER_POLICY=PASS');
      console.log(
        'GOOGLE_OAUTH_CALLBACK_EXECUTION=BLOCKED_EXTERNAL_DEPENDENCY',
      );
    } finally {
      await cleanupTemporaryUsers();

      await prisma.session.deleteMany({
        where: {
          userId: fixedUser.id,
          userAgent,
        },
      });

      await prisma.authProviderAccount.deleteMany({
        where: {
          provider: AuthProvider.GOOGLE,
          providerId: fixedProviderId,
        },
      });
    }
  });

  test('13. TC-WF-008 Register Provider/Requester Website', async ({
    request,
  }) => {
    const actorEmail = 'website.actor.e2e@backlyst.test';
    const websiteName = 'E2E Registered Marketplace Website';
    const submittedWebsiteUrl = 'https://website-registration-tc-wf-008.test';
    const storedWebsiteUrl = 'website-registration-tc-wf-008.test';
    const rootDomain = 'website-registration-tc-wf-008.test';

    const actor = await prisma.user.findUniqueOrThrow({
      where: {
        email: actorEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    expect(actor).toMatchObject({
      email: actorEmail,
      role: 'USER',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isDeleted: false,
    });

    const removeTestWebsites = async () => {
      const websites = await prisma.website.findMany({
        where: {
          authorId: actor.id,
          rootDomain,
        },
        select: {
          id: true,
        },
      });

      const websiteIds = websites.map((website) => website.id);

      if (websiteIds.length === 0) {
        return;
      }

      await prisma.websiteMarketplaceTag.deleteMany({
        where: {
          websiteId: {
            in: websiteIds,
          },
        },
      });

      await prisma.websiteMarketplaceCategory.deleteMany({
        where: {
          websiteId: {
            in: websiteIds,
          },
        },
      });

      await prisma.website.deleteMany({
        where: {
          id: {
            in: websiteIds,
          },
        },
      });
    };

    await removeTestWebsites();

    expect(
      await prisma.website.count({
        where: {
          authorId: actor.id,
        },
      }),
    ).toBe(0);

    const primaryCategory = await prisma.marketplaceCategory.findUniqueOrThrow({
      where: {
        id: MARKETPLACE_E2E_IDS.taxonomyCategoryId,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        enabled: true,
      },
    });

    expect(primaryCategory).toMatchObject({
      id: MARKETPLACE_E2E_IDS.taxonomyCategoryId,
      slug: 'e2e-technology',
      name: 'E2E Technology',
      enabled: true,
    });

    const websitePayload = {
      name: websiteName,
      websiteUrl: submittedWebsiteUrl,
      industry: 'TECH',
      country: 'US',
      marketplaceCategoryId: primaryCategory.id,
    };

    try {
      const websitesBefore = await prisma.website.count();

      const unauthenticatedResponse = await request.post('/website', {
        data: websitePayload,
      });

      expect(unauthenticatedResponse.status()).toBe(401);
      expect(await prisma.website.count()).toBe(websitesBefore);

      const actorToken = await loginOrFail(
        request,
        'Website registration actor',
        actorEmail,
      );

      const malformedResponse = await request.post('/website', {
        headers: {
          Authorization: `Bearer ${actorToken}`,
        },
        data: {
          name: websiteName,
          websiteUrl: 'not-a-valid-url',
          industry: 'TECH',
          country: 'US',
        },
      });

      const malformedBody = await malformedResponse.text();

      expect(
        malformedResponse.status(),
        `Malformed website payload returned HTTP ${malformedResponse.status()}: ${malformedBody.slice(0, 500)}`,
      ).toBe(400);

      expect(await prisma.website.count()).toBe(websitesBefore);

      const createResponse = await request.post('/website', {
        headers: {
          Authorization: `Bearer ${actorToken}`,
        },
        data: websitePayload,
      });

      const createRawBody = await createResponse.text();

      expect(
        createResponse.status(),
        `Website creation returned HTTP ${createResponse.status()}: ${createRawBody.slice(0, 1000)}`,
      ).toBe(201);

      let createBody: any;

      try {
        createBody = JSON.parse(createRawBody);
      } catch {
        throw new Error(
          `Website creation returned non-JSON content: ${createRawBody.slice(0, 1000)}`,
        );
      }

      expect(createBody).toMatchObject({
        success: true,
        message: 'Website added successfully, wait for verification',
        data: {
          id: expect.any(String),
          name: websiteName,
          websiteUrl: storedWebsiteUrl,
          authorId: actor.id,
          industry: 'TECH',
          country: 'US',
          rootDomain,
          verificationStatus: 'PENDING',
          isDeleted: false,
        },
      });

      const createdWebsiteId = createBody?.data?.id;

      expect(typeof createdWebsiteId).toBe('string');
      expect(createdWebsiteId.length).toBeGreaterThan(0);

      const persistedWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: createdWebsiteId,
        },
        include: {
          marketplaceCategories: true,
          marketplaceTags: true,
        },
      });

      expect(persistedWebsite).toMatchObject({
        id: createdWebsiteId,
        authorId: actor.id,
        name: websiteName,
        websiteUrl: storedWebsiteUrl,
        rootDomain,
        industry: 'TECH',
        country: 'US',
        verificationStatus: 'PENDING',
        isDeleted: false,
      });

      expect(persistedWebsite.marketplaceCategories).toEqual([
        expect.objectContaining({
          categoryId: primaryCategory.id,
          role: 'PRIMARY',
        }),
      ]);

      expect(persistedWebsite.marketplaceTags).toHaveLength(0);
      expect(await prisma.website.count()).toBe(websitesBefore + 1);

      const myWebsitesResponse = await request.get(
        '/website/my-websites?page=1&limit=50',
        {
          headers: {
            Authorization: `Bearer ${actorToken}`,
          },
        },
      );

      const myWebsitesBody = await myWebsitesResponse.json();
      const myWebsiteItems =
        myWebsitesBody?.data?.data ?? myWebsitesBody?.data?.items ?? [];

      expect(myWebsitesResponse.status()).toBe(200);
      expect(myWebsitesBody).toMatchObject({
        success: true,
        message: 'Websites fetched successfully',
        data: {
          meta: {
            page: 1,
            limit: 50,
          },
        },
      });

      expect(Array.isArray(myWebsiteItems)).toBeTruthy();

      expect(myWebsiteItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdWebsiteId,
            name: websiteName,
            websiteUrl: storedWebsiteUrl,
            verificationStatus: 'PENDING',
            author: expect.objectContaining({
              id: actor.id,
              email: actorEmail,
            }),
          }),
        ]),
      );

      expect(
        myWebsiteItems.every(
          (website: any) => website?.author?.id === actor.id,
        ),
      ).toBe(true);

      const detailResponse = await request.get(`/website/${createdWebsiteId}`, {
        headers: {
          Authorization: `Bearer ${actorToken}`,
        },
      });

      const detailBody = await detailResponse.json();

      expect(detailResponse.status()).toBe(200);
      expect(detailBody).toMatchObject({
        success: true,
        message: 'Website fetched successfully',
        data: {
          id: createdWebsiteId,
          authorId: actor.id,
          name: websiteName,
          websiteUrl: storedWebsiteUrl,
          rootDomain,
          verificationStatus: 'PENDING',
        },
      });

      const wrongOwnerResponse = await request.get(
        `/website/${createdWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${activeProviderToken}`,
          },
        },
      );

      expect(wrongOwnerResponse.status()).toBe(403);

      const unknownWebsiteResponse = await request.get(
        '/website/00000000-0000-4000-8000-000000000008',
        {
          headers: {
            Authorization: `Bearer ${actorToken}`,
          },
        },
      );

      expect(unknownWebsiteResponse.status()).toBe(404);

      const duplicateResponse = await request.post('/website', {
        headers: {
          Authorization: `Bearer ${actorToken}`,
        },
        data: websitePayload,
      });

      const duplicateBody = await duplicateResponse.text();

      expect(duplicateResponse.status()).toBe(409);
      expect(duplicateBody).toContain('Website already exists');

      expect(await prisma.website.count()).toBe(websitesBefore + 1);

      expect(
        await prisma.website.count({
          where: {
            authorId: actor.id,
            rootDomain,
          },
        }),
      ).toBe(1);

      console.log('TC_WF_008_WEBSITE_CREATE=PASS');
      console.log('TC_WF_008_MY_WEBSITES=PASS');
      console.log('TC_WF_008_WEBSITE_DETAIL=PASS');
      console.log('TC_WF_008_NEGATIVE_MATRIX=PASS');
    } finally {
      await removeTestWebsites();
    }
  });

  test('14. TC-WF-009 Update Owned Website', async ({ request }) => {
    const ownerEmail = 'requester.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const websiteId = MARKETPLACE_E2E_IDS.requesterWebsiteId;
    const unknownWebsiteId = '00000000-0000-4000-8000-000000000009';

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const readAuthoritativeState = () =>
      prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        select: {
          id: true,
          authorId: true,
          name: true,
          websiteUrl: true,
          rootDomain: true,
          industry: true,
          country: true,
          description: true,
          tagline: true,
          logoKey: true,
          isDeleted: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedMethod: true,
          marketplaceVisibilityStatus: true,
          visibilityGraceStartedAt: true,
          visibilityGraceEndsAt: true,
          createdAt: true,
          updatedAt: true,
          matchingProfile: {
            select: {
              id: true,
              websiteId: true,
              userId: true,
              marketplaceStatus: true,
              isSuppressed: true,
              visibilityScore: true,
              opportunityScore: true,
              reputationScore: true,
              qualityScore: true,
            },
          },
          marketplaceCategories: {
            orderBy: {
              id: 'asc',
            },
            select: {
              id: true,
              categoryId: true,
              role: true,
            },
          },
          marketplaceTags: {
            orderBy: {
              id: 'asc',
            },
            select: {
              id: true,
              tagId: true,
            },
          },
        },
      });

    const initialState = await readAuthoritativeState();

    expect(owner).toMatchObject({
      email: ownerEmail,
      role: 'USER',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isDeleted: false,
    });

    expect(initialState).toMatchObject({
      id: websiteId,
      authorId: owner.id,
      isDeleted: false,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
      matchingProfile: {
        websiteId,
        userId: owner.id,
        marketplaceStatus: 'ACTIVE',
      },
    });

    const validUpdatePayload = {
      name: 'E2E Requester Website Updated',
      description: 'Updated by deterministic TC-WF-009 owner workflow.',
      industry: 'SOFTWARE',
      country: 'BD',
      tagline: 'Deterministic owner update',
    };

    try {
      const unauthenticatedResponse = await request.patch(
        `/website/${websiteId}`,
        {
          data: validUpdatePayload,
        },
      );

      expect(unauthenticatedResponse.status()).toBe(401);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const wrongOwnerToken = await loginOrFail(
        request,
        'Wrong website owner',
        wrongOwnerEmail,
      );

      const wrongOwnerResponse = await request.patch(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${wrongOwnerToken}`,
        },
        data: validUpdatePayload,
      });

      expect(wrongOwnerResponse.status()).toBe(403);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const ownerToken = await loginOrFail(
        request,
        'Website owner',
        ownerEmail,
      );

      const malformedResponse = await request.patch(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        data: {
          description: 'x'.repeat(1001),
        },
      });

      expect(malformedResponse.status()).toBe(400);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const unknownWebsiteResponse = await request.patch(
        `/website/${unknownWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: validUpdatePayload,
        },
      );

      expect(unknownWebsiteResponse.status()).toBe(404);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const updateResponse = await request.patch(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        data: validUpdatePayload,
      });

      const updateBody = await updateResponse.json();

      expect(updateResponse.status()).toBe(200);
      expect(updateBody).toMatchObject({
        success: true,
        message: 'Website updated successfully',
        data: {
          id: websiteId,
          name: validUpdatePayload.name,
          description: validUpdatePayload.description,
          industry: validUpdatePayload.industry,
          country: validUpdatePayload.country,
          tagline: validUpdatePayload.tagline,
        },
      });

      const updatedState = await readAuthoritativeState();

      expect(updatedState).toMatchObject({
        id: websiteId,
        authorId: initialState.authorId,
        name: validUpdatePayload.name,
        description: validUpdatePayload.description,
        industry: validUpdatePayload.industry,
        country: validUpdatePayload.country,
        tagline: validUpdatePayload.tagline,
        websiteUrl: initialState.websiteUrl,
        rootDomain: initialState.rootDomain,
        isDeleted: false,
        verificationStatus: initialState.verificationStatus,
        verifiedAt: initialState.verifiedAt,
        verifiedMethod: initialState.verifiedMethod,
        marketplaceVisibilityStatus: initialState.marketplaceVisibilityStatus,
        visibilityGraceStartedAt: initialState.visibilityGraceStartedAt,
        visibilityGraceEndsAt: initialState.visibilityGraceEndsAt,
      });

      expect(updatedState.updatedAt.getTime()).toBeGreaterThan(
        initialState.updatedAt.getTime(),
      );

      expect(updatedState.matchingProfile).toEqual(
        initialState.matchingProfile,
      );
      expect(updatedState.marketplaceCategories).toEqual(
        initialState.marketplaceCategories,
      );
      expect(updatedState.marketplaceTags).toEqual(
        initialState.marketplaceTags,
      );

      const readBackResponse = await request.get(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });

      const readBackBody = await readBackResponse.json();

      expect(readBackResponse.status()).toBe(200);
      expect(readBackBody).toMatchObject({
        success: true,
        message: 'Website fetched successfully',
        data: {
          id: websiteId,
          authorId: owner.id,
          name: validUpdatePayload.name,
          description: validUpdatePayload.description,
          industry: validUpdatePayload.industry,
          country: validUpdatePayload.country,
          tagline: validUpdatePayload.tagline,
          websiteUrl: initialState.websiteUrl,
          rootDomain: initialState.rootDomain,
          isDeleted: false,
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          isDeleted: true,
        },
      });

      const deletedWebsiteResponse = await request.patch(
        `/website/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            name: 'This mutation must be rejected',
          },
        },
      );

      expect(deletedWebsiteResponse.status()).toBe(404);

      const deletedState = await readAuthoritativeState();

      expect(deletedState).toMatchObject({
        id: websiteId,
        name: validUpdatePayload.name,
        isDeleted: true,
      });

      console.log('TC_WF_009_OWNER_UPDATE=PASS');
      console.log('TC_WF_009_READ_BACK=PASS');
      console.log('TC_WF_009_OWNERSHIP_MATRIX=PASS');
      console.log('TC_WF_009_NO_UNEXPECTED_SIDE_EFFECTS=PASS');
    } finally {
      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          name: initialState.name,
          industry: initialState.industry,
          country: initialState.country,
          description: initialState.description,
          tagline: initialState.tagline,
          logoKey: initialState.logoKey,
          isDeleted: initialState.isDeleted,
        },
      });
    }
  });

  test('15. TC-WF-010 Delete Owned Website', async ({ request }) => {
    const ownerEmail = 'requester.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const websiteId = MARKETPLACE_E2E_IDS.requesterWebsiteId;
    const unknownWebsiteId = '00000000-0000-4000-8000-000000000010';

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const readAuthoritativeState = () =>
      prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        select: {
          id: true,
          authorId: true,
          name: true,
          websiteUrl: true,
          rootDomain: true,
          industry: true,
          country: true,
          description: true,
          tagline: true,
          logoKey: true,
          isDeleted: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedMethod: true,
          marketplaceVisibilityStatus: true,
          visibilityGraceStartedAt: true,
          visibilityGraceEndsAt: true,
          createdAt: true,
          updatedAt: true,
          matchingProfile: {
            select: {
              id: true,
              websiteId: true,
              userId: true,
              marketplaceStatus: true,
              isSuppressed: true,
              visibilityScore: true,
              opportunityScore: true,
              reputationScore: true,
              qualityScore: true,
            },
          },
          marketplaceCategories: {
            orderBy: {
              id: 'asc',
            },
            select: {
              id: true,
              categoryId: true,
              role: true,
            },
          },
          marketplaceTags: {
            orderBy: {
              id: 'asc',
            },
            select: {
              id: true,
              tagId: true,
            },
          },
        },
      });

    const initialState = await readAuthoritativeState();

    expect(owner).toMatchObject({
      email: ownerEmail,
      role: 'USER',
      status: UserStatus.ACTIVE,
      isVerified: true,
      isDeleted: false,
    });

    expect(initialState).toMatchObject({
      id: websiteId,
      authorId: owner.id,
      isDeleted: false,
      verificationStatus: 'VERIFIED',
      marketplaceVisibilityStatus: 'VISIBLE',
      matchingProfile: {
        websiteId,
        userId: owner.id,
        marketplaceStatus: 'ACTIVE',
      },
    });

    try {
      const unauthenticatedResponse = await request.delete(
        `/website/${websiteId}`,
      );

      expect(unauthenticatedResponse.status()).toBe(401);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const wrongOwnerToken = await loginOrFail(
        request,
        'Wrong website owner',
        wrongOwnerEmail,
      );

      const wrongOwnerResponse = await request.delete(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${wrongOwnerToken}`,
        },
      });

      expect(wrongOwnerResponse.status()).toBe(403);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const ownerToken = await loginOrFail(
        request,
        'Website owner',
        ownerEmail,
      );

      const unknownWebsiteResponse = await request.delete(
        `/website/${unknownWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      expect(unknownWebsiteResponse.status()).toBe(404);
      expect(await readAuthoritativeState()).toEqual(initialState);

      const deleteResponse = await request.delete(`/website/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });

      const deleteBody = await deleteResponse.json();

      expect(deleteResponse.status()).toBe(200);
      expect(deleteBody).toMatchObject({
        success: true,
        message: 'Website deleted successfully',
      });

      const deletedState = await readAuthoritativeState();

      expect(deletedState).toMatchObject({
        id: websiteId,
        authorId: initialState.authorId,
        name: initialState.name,
        websiteUrl: initialState.websiteUrl,
        rootDomain: initialState.rootDomain,
        industry: initialState.industry,
        country: initialState.country,
        description: initialState.description,
        tagline: initialState.tagline,
        logoKey: initialState.logoKey,
        isDeleted: true,
        verificationStatus: initialState.verificationStatus,
        verifiedAt: initialState.verifiedAt,
        verifiedMethod: initialState.verifiedMethod,
        marketplaceVisibilityStatus: initialState.marketplaceVisibilityStatus,
        visibilityGraceStartedAt: initialState.visibilityGraceStartedAt,
        visibilityGraceEndsAt: initialState.visibilityGraceEndsAt,
      });

      expect(deletedState.updatedAt.getTime()).toBeGreaterThanOrEqual(
        initialState.updatedAt.getTime(),
      );

      expect(deletedState.matchingProfile).toEqual(
        initialState.matchingProfile,
      );
      expect(deletedState.marketplaceCategories).toEqual(
        initialState.marketplaceCategories,
      );
      expect(deletedState.marketplaceTags).toEqual(
        initialState.marketplaceTags,
      );

      expect(
        await prisma.website.count({
          where: {
            id: websiteId,
          },
        }),
      ).toBe(1);

      const detailAfterDeleteResponse = await request.get(
        `/website/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      expect(detailAfterDeleteResponse.status()).toBe(404);

      const myWebsitesResponse = await request.get('/website/my-websites', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });

      const myWebsitesBody = await myWebsitesResponse.json();

      expect(myWebsitesResponse.status()).toBe(200);
      expect(JSON.stringify(myWebsitesBody)).not.toContain(websiteId);

      const repeatedDeleteResponse = await request.delete(
        `/website/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      expect(repeatedDeleteResponse.status()).toBe(404);
      expect(await readAuthoritativeState()).toEqual(deletedState);

      console.log('TC_WF_010_OWNER_DELETE=PASS');
      console.log('TC_WF_010_SOFT_DELETE_STATE=PASS');
      console.log('TC_WF_010_HIDDEN_FROM_READS=PASS');
      console.log('TC_WF_010_OWNERSHIP_MATRIX=PASS');
      console.log('TC_WF_010_NO_UNEXPECTED_CASCADE=PASS');
    } finally {
      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          isDeleted: initialState.isDeleted,
        },
      });
    }
  });

  test('16. TC-WF-011 Request DNS Verification', async ({ request }) => {
    const websiteId = MARKETPLACE_E2E_IDS.unverifiedWebsiteId;
    const ownerEmail = 'website.dns.owner.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const expectedDnsRecord =
      'backlyst-verification=e2e-dns-verification-token';
    const unknownWebsiteId = '99999999-9999-4999-8999-999999999999';

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const ownerToken = await loginOrFail(
      request,
      'TC-WF-011 DNS verification owner',
      ownerEmail,
    );

    const wrongOwnerToken = await loginOrFail(
      request,
      'TC-WF-011 wrong owner',
      wrongOwnerEmail,
    );

    const restoreDnsFixture = async () => {
      await prisma.websiteMatchingProfile.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.websiteVerification.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'PENDING',
          verifiedAt: null,
          verifiedMethod: null,
          latestVerificationId: null,
          isDeleted: false,
        },
      });
    };

    await restoreDnsFixture();

    const websitesBefore = await prisma.website.count();
    const verificationsBefore = await prisma.websiteVerification.count();

    try {
      expect(owner).toMatchObject({
        email: ownerEmail,
        status: 'ACTIVE',
        isVerified: true,
        isDeleted: false,
      });

      const initialWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(initialWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        websiteUrl: 'https://dns-owner-e2e.test',
        rootDomain: 'dns-owner-e2e.test',
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedMethod: null,
        latestVerificationId: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const unauthenticatedResponse = await request.post(
        `/website-verification/dns/request/${websiteId}`,
      );

      expect(unauthenticatedResponse.status()).toBe(401);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const wrongOwnerResponse = await request.post(
        `/website-verification/dns/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
        },
      );

      const wrongOwnerBody = await wrongOwnerResponse.text();

      expect(
        wrongOwnerResponse.status(),
        `Wrong-owner DNS request returned HTTP ${wrongOwnerResponse.status()}: ${wrongOwnerBody.slice(0, 500)}`,
      ).toBe(403);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const unknownWebsiteResponse = await request.post(
        `/website-verification/dns/request/${unknownWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      expect(unknownWebsiteResponse.status()).toBe(404);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      console.log('TC_WF_011_OWNERSHIP_MATRIX=PASS');

      const verificationResponse = await request.post(
        `/website-verification/dns/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const verificationRawBody = await verificationResponse.text();

      expect(
        verificationResponse.status(),
        `Owner DNS verification returned HTTP ${verificationResponse.status()}: ${verificationRawBody.slice(0, 1000)}`,
      ).toBe(201);

      let verificationBody: any;

      try {
        verificationBody = JSON.parse(verificationRawBody);
      } catch {
        throw new Error(
          `DNS verification returned non-JSON content: ${verificationRawBody.slice(0, 1000)}`,
        );
      }

      expect(verificationBody).toMatchObject({
        success: true,
        message: 'DNS verification successful',
        data: {
          success: true,
        },
      });

      console.log('TC_WF_011_DNS_REQUEST=PASS');

      const persistedVerification =
        await prisma.websiteVerification.findFirstOrThrow({
          where: {
            websiteId,
            requestedByUserId: owner.id,
            type: 'DNS_TXT_RECORD',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      expect(persistedVerification).toMatchObject({
        websiteId,
        requestedByUserId: owner.id,
        type: 'DNS_TXT_RECORD',
        verifiedBy: 'AUTOMATIC',
        status: 'VERIFIED',
        errorMessage: null,
        rejectReason: null,
      });

      expect(persistedVerification.verifiedAt).toBeInstanceOf(Date);

      const responseData =
        typeof persistedVerification.responseData === 'string'
          ? JSON.parse(persistedVerification.responseData)
          : persistedVerification.responseData;

      expect(responseData).toMatchObject({
        expected: expectedDnsRecord,
        actual: [expectedDnsRecord],
        isValid: true,
      });

      expect(typeof responseData?.checkedAt).toBe('string');
      expect(Number.isNaN(Date.parse(responseData.checkedAt))).toBe(false);

      const verifiedWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(verifiedWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        websiteUrl: initialWebsite.websiteUrl,
        rootDomain: initialWebsite.rootDomain,
        verificationStatus: 'VERIFIED',
        verifiedMethod: 'DNS_TXT_RECORD',
        latestVerificationId: persistedVerification.id,
        isDeleted: false,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      expect(verifiedWebsite.verifiedAt).toBeInstanceOf(Date);

      expect(verifiedWebsite.matchingProfile).toMatchObject({
        websiteId,
        userId: owner.id,
        visibilityScore: 50,
        opportunityScore: 50,
        reputationScore: 50,
        internalPriorityScore: 50,
        reliabilityScore: 50,
        riskScore: 0,
        diversityScore: 50,
        firstSuccessBoostActive: true,
      });

      const myRequestsResponse = await request.get(
        '/website-verification/my-requests?type=DNS_TXT_RECORD&status=VERIFIED&page=1&limit=10',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const myRequestsBody = await myRequestsResponse.json();

      expect(myRequestsResponse.status()).toBe(200);

      const requestCollections = [
        myRequestsBody?.data?.data,
        myRequestsBody?.data?.items,
        myRequestsBody?.data,
        myRequestsBody?.items,
      ];

      const requestItems =
        requestCollections.find((value) => Array.isArray(value)) ?? [];

      expect(requestItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: persistedVerification.id,
            type: 'DNS_TXT_RECORD',
            status: 'VERIFIED',
            website: expect.objectContaining({
              id: websiteId,
            }),
          }),
        ]),
      );

      const detailResponse = await request.get(
        `/website-verification/details/${persistedVerification.id}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const detailBody = await detailResponse.json();
      const detail = detailBody?.data ?? detailBody;

      expect(detailResponse.status()).toBe(200);

      expect(detail).toMatchObject({
        id: persistedVerification.id,
        websiteId,
        type: 'DNS_TXT_RECORD',
        status: 'VERIFIED',
        website: {
          id: websiteId,
          websiteUrl: initialWebsite.websiteUrl,
          verificationStatus: 'VERIFIED',
          verifiedMethod: 'DNS_TXT_RECORD',
        },
      });

      const wrongOwnerDetailResponse = await request.get(
        `/website-verification/details/${persistedVerification.id}`,
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
        },
      );

      expect(wrongOwnerDetailResponse.status()).toBe(404);

      console.log('TC_WF_011_READ_BACK=PASS');

      const duplicateResponse = await request.post(
        `/website-verification/dns/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const duplicateBody = await duplicateResponse.text();

      expect(
        duplicateResponse.status(),
        `Duplicate DNS request returned HTTP ${duplicateResponse.status()}: ${duplicateBody.slice(0, 500)}`,
      ).toBe(400);

      expect(duplicateBody).toContain('Website already verified');

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(1);

      expect(await prisma.website.count()).toBe(websitesBefore);
      expect(await prisma.websiteVerification.count()).toBe(
        verificationsBefore + 1,
      );

      console.log('TC_WF_011_NO_UNEXPECTED_SIDE_EFFECTS=PASS');
    } finally {
      await restoreDnsFixture();
    }
  });

  test('17. TC-WF-012 Request Meta-Tag Verification', async ({ request }) => {
    const websiteId = MARKETPLACE_E2E_IDS.metaTagWebsiteId;
    const ownerEmail = 'website.meta.owner.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const expectedWebsiteUrl = 'https://meta-owner-e2e.test';
    const expectedMetaName = 'backlyst-verification';
    const expectedToken = 'e2e-dns-verification-token';
    const expectedMetaTag =
      '<meta name="backlyst-verification" content="e2e-dns-verification-token" />';
    const expectedDnsRecord =
      'backlyst-verification=e2e-dns-verification-token';
    const unknownWebsiteId = '77777777-7777-4777-8777-777777777777';

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const ownerToken = await loginOrFail(
      request,
      'TC-WF-012 meta-tag verification owner',
      ownerEmail,
    );

    const wrongOwnerToken = await loginOrFail(
      request,
      'TC-WF-012 wrong owner',
      wrongOwnerEmail,
    );

    const restoreMetaTagFixture = async () => {
      await prisma.websiteMatchingProfile.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.websiteVerification.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'PENDING',
          verifiedAt: null,
          verifiedMethod: null,
          latestVerificationId: null,
          isDeleted: false,
        },
      });
    };

    await restoreMetaTagFixture();

    const websitesBefore = await prisma.website.count();
    const verificationsBefore = await prisma.websiteVerification.count();
    const matchingProfilesBefore = await prisma.websiteMatchingProfile.count();

    try {
      expect(owner).toMatchObject({
        email: ownerEmail,
        status: 'ACTIVE',
        isVerified: true,
        isDeleted: false,
      });

      const initialWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(initialWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        websiteUrl: expectedWebsiteUrl,
        rootDomain: 'meta-owner-e2e.test',
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedMethod: null,
        latestVerificationId: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const metaTagsResponse = await request.get(
        '/website-verification/meta-tags',
      );
      const metaTagsRawBody = await metaTagsResponse.text();

      expect(
        metaTagsResponse.status(),
        `Meta-tag configuration request produced HTTP ${metaTagsResponse.status()}: ${metaTagsRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let metaTagsBody: any;

      try {
        metaTagsBody = JSON.parse(metaTagsRawBody);
      } catch {
        throw new Error(
          `Meta-tag configuration produced non-JSON content: ${metaTagsRawBody.slice(0, 1000)}`,
        );
      }

      expect(metaTagsBody).toMatchObject({
        success: true,
        message: 'Meta tags fetched successfully',
        data: {
          metaTag: expectedMetaTag,
          dnsTxt: expectedDnsRecord,
        },
      });

      console.log('TC_WF_012_META_TAG_CONFIG=PASS');

      const unauthenticatedResponse = await request.post(
        `/website-verification/meta-tag/request/${websiteId}`,
      );

      expect(unauthenticatedResponse.status()).toBe(401);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const wrongOwnerResponse = await request.post(
        `/website-verification/meta-tag/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
        },
      );

      const wrongOwnerBody = await wrongOwnerResponse.text();

      expect(
        wrongOwnerResponse.status(),
        `Wrong-owner meta-tag request produced HTTP ${wrongOwnerResponse.status()}: ${wrongOwnerBody.slice(0, 500)}`,
      ).toBe(403);

      expect(wrongOwnerBody).toContain(
        'You do not have permission to verify this website',
      );

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const unknownWebsiteResponse = await request.post(
        `/website-verification/meta-tag/request/${unknownWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      expect(unknownWebsiteResponse.status()).toBe(404);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      console.log('TC_WF_012_OWNERSHIP_MATRIX=PASS');

      const verificationResponse = await request.post(
        `/website-verification/meta-tag/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const verificationRawBody = await verificationResponse.text();

      expect(
        verificationResponse.status(),
        `Owner meta-tag verification produced HTTP ${verificationResponse.status()}: ${verificationRawBody.slice(0, 1000)}`,
      ).toBe(201);

      let verificationBody: any;

      try {
        verificationBody = JSON.parse(verificationRawBody);
      } catch {
        throw new Error(
          `Meta-tag verification produced non-JSON content: ${verificationRawBody.slice(0, 1000)}`,
        );
      }

      expect(verificationBody).toMatchObject({
        success: true,
        message: 'Website verified successfully',
        data: {
          success: true,
        },
      });

      console.log('TC_WF_012_META_TAG_REQUEST=PASS');

      const persistedVerification =
        await prisma.websiteVerification.findFirstOrThrow({
          where: {
            websiteId,
            requestedByUserId: owner.id,
            type: 'HTML_META_TAG',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      expect(persistedVerification).toMatchObject({
        websiteId,
        requestedByUserId: owner.id,
        type: 'HTML_META_TAG',
        verifiedBy: 'AUTOMATIC',
        status: 'VERIFIED',
        verifiedDomain: expectedWebsiteUrl,
        errorMessage: null,
        rejectReason: null,
      });

      expect(persistedVerification.verifiedAt).toBeInstanceOf(Date);

      const responseData =
        typeof persistedVerification.responseData === 'string'
          ? JSON.parse(persistedVerification.responseData)
          : persistedVerification.responseData;

      expect(responseData).toMatchObject({
        metaName: expectedMetaName,
        expectedToken,
        verifiedDomain: expectedWebsiteUrl,
        isValid: true,
      });

      expect(typeof responseData?.checkedAt).toBe('string');
      expect(Number.isNaN(Date.parse(responseData.checkedAt))).toBe(false);

      const verifiedWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(verifiedWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        websiteUrl: initialWebsite.websiteUrl,
        rootDomain: initialWebsite.rootDomain,
        verificationStatus: 'VERIFIED',
        verifiedMethod: 'HTML_META_TAG',
        latestVerificationId: persistedVerification.id,
        isDeleted: false,
        matchingProfile: {
          websiteId,
          userId: owner.id,
          visibilityScore: 50,
          opportunityScore: 50,
          reputationScore: 50,
          internalPriorityScore: 50,
          reliabilityScore: 50,
          riskScore: 0,
          diversityScore: 50,
          firstSuccessBoostActive: true,
        },
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      expect(verifiedWebsite.verifiedAt).toBeInstanceOf(Date);

      const myRequestsResponse = await request.get(
        '/website-verification/my-requests?type=HTML_META_TAG&status=VERIFIED&page=1&limit=10',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const myRequestsRawBody = await myRequestsResponse.text();

      expect(
        myRequestsResponse.status(),
        `Meta-tag request listing produced HTTP ${myRequestsResponse.status()}: ${myRequestsRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let myRequestsBody: any;

      try {
        myRequestsBody = JSON.parse(myRequestsRawBody);
      } catch {
        throw new Error(
          `Meta-tag request listing produced non-JSON content: ${myRequestsRawBody.slice(0, 1000)}`,
        );
      }

      const myRequestItems = myRequestsBody?.data?.data;

      expect(Array.isArray(myRequestItems)).toBe(true);

      const listedVerification = myRequestItems.find(
        (item: any) => item.id === persistedVerification.id,
      );

      expect(listedVerification).toMatchObject({
        id: persistedVerification.id,
        type: 'HTML_META_TAG',
        status: 'VERIFIED',
        website: {
          id: websiteId,
          websiteUrl: expectedWebsiteUrl,
          verificationStatus: 'VERIFIED',
        },
      });

      const detailResponse = await request.get(
        `/website-verification/details/${persistedVerification.id}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const detailRawBody = await detailResponse.text();

      expect(
        detailResponse.status(),
        `Meta-tag detail request produced HTTP ${detailResponse.status()}: ${detailRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let detailBody: any;

      try {
        detailBody = JSON.parse(detailRawBody);
      } catch {
        throw new Error(
          `Meta-tag detail request produced non-JSON content: ${detailRawBody.slice(0, 1000)}`,
        );
      }

      const detail = detailBody?.data ?? detailBody;

      expect(detail).toMatchObject({
        id: persistedVerification.id,
        websiteId,
        type: 'HTML_META_TAG',
        status: 'VERIFIED',
        website: {
          id: websiteId,
          websiteUrl: expectedWebsiteUrl,
          verificationStatus: 'VERIFIED',
          verifiedMethod: 'HTML_META_TAG',
        },
      });

      const wrongOwnerDetailResponse = await request.get(
        `/website-verification/details/${persistedVerification.id}`,
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
        },
      );

      expect(wrongOwnerDetailResponse.status()).toBe(404);

      console.log('TC_WF_012_READ_BACK=PASS');

      const duplicateResponse = await request.post(
        `/website-verification/meta-tag/request/${websiteId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const duplicateBody = await duplicateResponse.text();

      expect(
        duplicateResponse.status(),
        `Duplicate meta-tag request produced HTTP ${duplicateResponse.status()}: ${duplicateBody.slice(0, 500)}`,
      ).toBe(400);

      expect(duplicateBody).toContain('Website already verified');

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(1);

      expect(await prisma.website.count()).toBe(websitesBefore);
      expect(await prisma.websiteVerification.count()).toBe(
        verificationsBefore + 1,
      );
      expect(await prisma.websiteMatchingProfile.count()).toBe(
        matchingProfilesBefore + 1,
      );

      console.log('TC_WF_012_NO_UNEXPECTED_SIDE_EFFECTS=PASS');
    } finally {
      await restoreMetaTagFixture();
    }
  });
  test('18. TC-WF-013 Request Screenshot Verification', async ({ request }) => {
    const websiteId = MARKETPLACE_E2E_IDS.screenshotWebsiteId;
    const ownerEmail = 'website.screenshot.owner.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const screenshotImageKey = 'website-verification/e2e-screenshot-proof.png';
    const unknownWebsiteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const ownerToken = await loginOrFail(
      request,
      'TC-WF-013 screenshot verification owner',
      ownerEmail,
    );

    const wrongOwnerToken = await loginOrFail(
      request,
      'TC-WF-013 wrong owner',
      wrongOwnerEmail,
    );

    const restoreScreenshotFixture = async () => {
      await prisma.websiteMatchingProfile.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.websiteVerification.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'PENDING',
          verifiedAt: null,
          verifiedMethod: null,
          latestVerificationId: null,
          isDeleted: false,
        },
      });
    };

    await restoreScreenshotFixture();

    const websitesBefore = await prisma.website.count();
    const verificationsBefore = await prisma.websiteVerification.count();
    const matchingProfilesBefore = await prisma.websiteMatchingProfile.count();

    try {
      expect(owner).toMatchObject({
        email: ownerEmail,
        status: 'ACTIVE',
        isVerified: true,
        isDeleted: false,
      });

      const initialWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(initialWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        name: 'E2E Screenshot Verification Website',
        websiteUrl: 'https://screenshot-owner-e2e.test',
        rootDomain: 'screenshot-owner-e2e.test',
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedMethod: null,
        latestVerificationId: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      const unauthenticatedResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          data: {
            websiteId,
            screenshotImageKey,
          },
        },
      );

      expect(unauthenticatedResponse.status()).toBe(401);

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      const missingKeyResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            websiteId,
          },
        },
      );

      const missingKeyBody = await missingKeyResponse.text();

      expect(
        missingKeyResponse.status(),
        `Missing screenshot key produced HTTP ${missingKeyResponse.status()}: ${missingKeyBody.slice(0, 500)}`,
      ).toBe(400);

      expect(missingKeyBody).toContain('screenshotImageKey');

      const invalidKeyResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            websiteId,
            screenshotImageKey: 'other/e2e-screenshot-proof.png',
          },
        },
      );

      const invalidKeyBody = await invalidKeyResponse.text();

      expect(
        invalidKeyResponse.status(),
        `Invalid screenshot key produced HTTP ${invalidKeyResponse.status()}: ${invalidKeyBody.slice(0, 500)}`,
      ).toBe(400);

      expect(invalidKeyBody).toContain('Invalid screenshot image key');

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      console.log('TC_WF_013_INPUT_VALIDATION=PASS');

      const wrongOwnerResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
          data: {
            websiteId,
            screenshotImageKey,
          },
        },
      );

      const wrongOwnerBody = await wrongOwnerResponse.text();

      expect(
        wrongOwnerResponse.status(),
        `Wrong-owner screenshot request produced HTTP ${wrongOwnerResponse.status()}: ${wrongOwnerBody.slice(0, 500)}`,
      ).toBe(403);

      expect(wrongOwnerBody).toContain(
        'You do not have permission to verify this website',
      );

      const unknownWebsiteResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            websiteId: unknownWebsiteId,
            screenshotImageKey,
          },
        },
      );

      const unknownWebsiteBody = await unknownWebsiteResponse.text();

      expect(
        unknownWebsiteResponse.status(),
        `Unknown screenshot website produced HTTP ${unknownWebsiteResponse.status()}: ${unknownWebsiteBody.slice(0, 500)}`,
      ).toBe(404);

      expect(unknownWebsiteBody).toContain('Website not found');

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      console.log('TC_WF_013_OWNERSHIP_MATRIX=PASS');

      const verificationResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            websiteId,
            screenshotImageKey,
          },
        },
      );

      const verificationRawBody = await verificationResponse.text();

      expect(
        verificationResponse.status(),
        `Owner screenshot verification produced HTTP ${verificationResponse.status()}: ${verificationRawBody.slice(0, 1000)}`,
      ).toBe(201);

      let verificationBody: any;

      try {
        verificationBody = JSON.parse(verificationRawBody);
      } catch {
        throw new Error(
          `Screenshot verification produced non-JSON content: ${verificationRawBody.slice(0, 1000)}`,
        );
      }

      expect(verificationBody).toMatchObject({
        success: true,
        message: 'Screenshot verification submitted for review',
        data: {
          websiteId,
          websiteVerificationId: expect.any(String),
        },
      });

      const verificationId = verificationBody.data.websiteVerificationId;

      expect(verificationId.length).toBeGreaterThan(0);

      const persistedVerification =
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: verificationId,
          },
        });

      expect(persistedVerification).toMatchObject({
        id: verificationId,
        websiteId,
        requestedByUserId: owner.id,
        type: 'SCREENSHOT_URL',
        status: 'REQUESTED_FOR_MANUAL_REVIEW',
        verifiedBy: 'AUTOMATIC',
        screenshotImageKey,
        verifiedAt: null,
        verifiedDomain: null,
        errorMessage: null,
        responseData: null,
        manuallyReviewedByAdminUserId: null,
        manualReviewNotes: null,
        rejectReason: null,
      });

      expect(persistedVerification.createdAt).toBeInstanceOf(Date);
      expect(persistedVerification.updatedAt).toBeInstanceOf(Date);

      const pendingWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(pendingWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        websiteUrl: initialWebsite.websiteUrl,
        rootDomain: initialWebsite.rootDomain,
        verificationStatus: 'PENDING',
        verifiedAt: null,
        verifiedMethod: null,
        latestVerificationId: verificationId,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      console.log('TC_WF_013_SCREENSHOT_REQUEST=PASS');

      const myRequestsResponse = await request.get(
        '/website-verification/my-requests?type=SCREENSHOT_URL&status=REQUESTED_FOR_MANUAL_REVIEW&page=1&limit=10',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const myRequestsRawBody = await myRequestsResponse.text();

      expect(
        myRequestsResponse.status(),
        `Screenshot request listing produced HTTP ${myRequestsResponse.status()}: ${myRequestsRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let myRequestsBody: any;

      try {
        myRequestsBody = JSON.parse(myRequestsRawBody);
      } catch {
        throw new Error(
          `Screenshot request listing produced non-JSON content: ${myRequestsRawBody.slice(0, 1000)}`,
        );
      }

      const myRequestItems = myRequestsBody?.data?.data;

      expect(Array.isArray(myRequestItems)).toBe(true);

      const listedVerification = myRequestItems.find(
        (item: any) => item.id === verificationId,
      );

      expect(listedVerification).toMatchObject({
        id: verificationId,
        type: 'SCREENSHOT_URL',
        status: 'REQUESTED_FOR_MANUAL_REVIEW',
        website: {
          id: websiteId,
          websiteUrl: initialWebsite.websiteUrl,
          verificationStatus: 'PENDING',
        },
      });

      expect(typeof listedVerification.screenshotUrl).toBe('string');
      expect(listedVerification.screenshotUrl.length).toBeGreaterThan(0);

      const detailResponse = await request.get(
        `/website-verification/details/${verificationId}`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const detailRawBody = await detailResponse.text();

      expect(
        detailResponse.status(),
        `Screenshot detail request produced HTTP ${detailResponse.status()}: ${detailRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let detailBody: any;

      try {
        detailBody = JSON.parse(detailRawBody);
      } catch {
        throw new Error(
          `Screenshot detail request produced non-JSON content: ${detailRawBody.slice(0, 1000)}`,
        );
      }

      const detail = detailBody?.data ?? detailBody;

      expect(detail).toMatchObject({
        id: verificationId,
        websiteId,
        type: 'SCREENSHOT_URL',
        status: 'REQUESTED_FOR_MANUAL_REVIEW',
        website: {
          id: websiteId,
          websiteUrl: initialWebsite.websiteUrl,
          verificationStatus: 'PENDING',
          verifiedAt: null,
          verifiedMethod: null,
        },
      });

      expect(typeof detail.screenshotUrl).toBe('string');
      expect(detail.screenshotUrl.length).toBeGreaterThan(0);

      const wrongOwnerDetailResponse = await request.get(
        `/website-verification/details/${verificationId}`,
        {
          headers: {
            Authorization: `Bearer ${wrongOwnerToken}`,
          },
        },
      );

      expect(wrongOwnerDetailResponse.status()).toBe(404);

      console.log('TC_WF_013_READ_BACK=PASS');

      const duplicateResponse = await request.post(
        '/website-verification/screenshot/request',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          data: {
            websiteId,
            screenshotImageKey,
          },
        },
      );

      const duplicateBody = await duplicateResponse.text();

      expect(
        duplicateResponse.status(),
        `Duplicate screenshot request produced HTTP ${duplicateResponse.status()}: ${duplicateBody.slice(0, 500)}`,
      ).toBe(400);

      expect(duplicateBody).toContain(
        'A verification request is already pending',
      );

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(1);

      expect(await prisma.website.count()).toBe(websitesBefore);
      expect(await prisma.websiteVerification.count()).toBe(
        verificationsBefore + 1,
      );
      expect(await prisma.websiteMatchingProfile.count()).toBe(
        matchingProfilesBefore,
      );

      console.log('TC_WF_013_DUPLICATE_GUARD=PASS');
      console.log('TC_WF_013_NO_UNEXPECTED_SIDE_EFFECTS=PASS');
    } finally {
      await restoreScreenshotFixture();
    }
  });

  test('19. TC-WF-014 Request Manual Verification Review', async ({
    request,
  }) => {
    const websiteId = MARKETPLACE_E2E_IDS.manualReviewWebsiteId;
    const failedVerificationId =
      MARKETPLACE_E2E_IDS.manualReviewFailedVerificationId;
    const ownerEmail = 'website.manual-review.owner.e2e@backlyst.test';
    const wrongOwnerEmail = 'provider.active.e2e@backlyst.test';
    const unknownWebsiteId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const manualReviewRoute = `/website-verification/manual-review/request/${websiteId}`;

    const owner = await prisma.user.findUniqueOrThrow({
      where: {
        email: ownerEmail,
      },
      select: {
        id: true,
        email: true,
        status: true,
        isVerified: true,
        isDeleted: true,
      },
    });

    const ownerToken = await loginOrFail(
      request,
      'TC-WF-014 manual-review owner',
      ownerEmail,
    );

    const wrongOwnerToken = await loginOrFail(
      request,
      'TC-WF-014 wrong owner',
      wrongOwnerEmail,
    );

    const restoreManualReviewFixture = async () => {
      await prisma.websiteMatchingProfile.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          latestVerificationId: null,
        },
      });

      await prisma.websiteVerification.deleteMany({
        where: {
          websiteId,
        },
      });

      await prisma.websiteVerification.create({
        data: {
          id: failedVerificationId,
          websiteId,
          type: 'DNS_TXT_RECORD',
          status: 'VERIFICATION_FAILED',
          requestedByUserId: owner.id,
          errorMessage: 'E2E deterministic DNS verification failure',
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          authorId: owner.id,
          name: 'E2E Failed Verification Website',
          websiteUrl: 'https://manual-review-owner-e2e.test',
          rootDomain: 'manual-review-owner-e2e.test',
          verificationStatus: 'VERIFICATION_FAILED',
          latestVerificationId: failedVerificationId,
          verifiedAt: null,
          verifiedMethod: null,
          isDeleted: false,
        },
      });
    };

    const assertManualReviewError = async (
      label: string,
      targetWebsiteId: string,
      token: string,
      expectedStatus: number,
      expectedMessage: string,
    ) => {
      const response = await request.post(
        `/website-verification/manual-review/request/${targetWebsiteId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const rawBody = await response.text();

      expect(
        response.status(),
        `${label} produced HTTP ${response.status()}: ${rawBody.slice(0, 1000)}`,
      ).toBe(expectedStatus);

      expect(rawBody).toContain(expectedMessage);
    };

    await restoreManualReviewFixture();

    const websitesBefore = await prisma.website.count();
    const verificationsBefore = await prisma.websiteVerification.count();
    const matchingProfilesBefore = await prisma.websiteMatchingProfile.count();

    try {
      expect(owner).toMatchObject({
        email: ownerEmail,
        status: 'ACTIVE',
        isVerified: true,
        isDeleted: false,
      });

      const initialWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(initialWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        name: 'E2E Failed Verification Website',
        websiteUrl: 'https://manual-review-owner-e2e.test',
        rootDomain: 'manual-review-owner-e2e.test',
        verificationStatus: 'VERIFICATION_FAILED',
        latestVerificationId: failedVerificationId,
        verifiedAt: null,
        verifiedMethod: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      const initialFailedVerification =
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: failedVerificationId,
          },
        });

      expect(initialFailedVerification).toMatchObject({
        id: failedVerificationId,
        websiteId,
        requestedByUserId: owner.id,
        type: 'DNS_TXT_RECORD',
        status: 'VERIFICATION_FAILED',
        verifiedBy: 'AUTOMATIC',
        verifiedAt: null,
        verifiedDomain: null,
        screenshotImageKey: null,
        errorMessage: 'E2E deterministic DNS verification failure',
        responseData: null,
        manuallyReviewedByAdminUserId: null,
        manualReviewNotes: null,
        rejectReason: null,
      });

      expect(initialFailedVerification.createdAt).toBeInstanceOf(Date);
      expect(initialFailedVerification.updatedAt).toBeInstanceOf(Date);

      const unauthenticatedResponse = await request.post(manualReviewRoute);

      expect(unauthenticatedResponse.status()).toBe(401);

      const swaggerResponse = await request.get('/api/docs-json');
      const swaggerRawBody = await swaggerResponse.text();

      expect(
        swaggerResponse.status(),
        `Swagger route discovery produced HTTP ${swaggerResponse.status()}: ${swaggerRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let swaggerBody: any;

      try {
        swaggerBody = JSON.parse(swaggerRawBody);
      } catch {
        throw new Error(
          `Swagger route discovery produced non-JSON content: ${swaggerRawBody.slice(0, 1000)}`,
        );
      }

      const swaggerRoute =
        '/website-verification/manual-review/request/{websiteId}';

      const registeredManualReviewRoutes = Object.entries(
        swaggerBody?.paths ?? {},
      ).filter(
        ([candidate, operations]) =>
          candidate === swaggerRoute && Boolean((operations as any)?.post),
      );

      expect(registeredManualReviewRoutes).toHaveLength(1);

      const registeredMethods = Object.keys(
        (registeredManualReviewRoutes[0]?.[1] as any) ?? {},
      ).filter((method) => method.toLowerCase() === 'post');

      expect(registeredMethods).toHaveLength(1);

      console.log('TC_WF_014_RUNTIME_ROUTE_REGISTRATION=PASS');

      await assertManualReviewError(
        'Wrong-owner manual-review request',
        websiteId,
        wrongOwnerToken,
        400,
        'Unauthorized',
      );

      await assertManualReviewError(
        'Unknown manual-review website',
        unknownWebsiteId,
        ownerToken,
        400,
        'Website not found',
      );

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'PENDING',
        },
      });

      await assertManualReviewError(
        'Pending website manual-review request',
        websiteId,
        ownerToken,
        400,
        'Manual review can only be requested after failed verification',
      );

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'VERIFICATION_FAILED',
        },
      });

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'VERIFIED',
        },
      });

      await assertManualReviewError(
        'Verified website manual-review request',
        websiteId,
        ownerToken,
        400,
        'Website already verified',
      );

      await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          verificationStatus: 'VERIFICATION_FAILED',
          latestVerificationId: null,
        },
      });

      await prisma.websiteVerification.delete({
        where: {
          id: failedVerificationId,
        },
      });

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
            status: 'VERIFICATION_FAILED',
          },
        }),
      ).toBe(0);

      await assertManualReviewError(
        'Missing failed-verification manual-review request',
        websiteId,
        ownerToken,
        400,
        'Failed verification request not found',
      );

      await restoreManualReviewFixture();

      expect(await prisma.website.count()).toBe(websitesBefore);
      expect(await prisma.websiteVerification.count()).toBe(
        verificationsBefore,
      );
      expect(await prisma.websiteMatchingProfile.count()).toBe(
        matchingProfilesBefore,
      );

      console.log('TC_WF_014_NEGATIVE_MATRIX=PASS');

      const failedVerificationBeforeRequest =
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: failedVerificationId,
          },
        });

      const verificationResponse = await request.post(manualReviewRoute, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });

      const verificationRawBody = await verificationResponse.text();

      expect(
        verificationResponse.status(),
        `Owner manual-review request produced HTTP ${verificationResponse.status()}: ${verificationRawBody.slice(0, 1000)}`,
      ).toBe(201);

      let verificationBody: any;

      try {
        verificationBody = JSON.parse(verificationRawBody);
      } catch {
        throw new Error(
          `Manual-review request produced non-JSON content: ${verificationRawBody.slice(0, 1000)}`,
        );
      }

      expect(verificationBody).toMatchObject({
        success: true,
        message: 'Manual review request submitted successfully',
        data: {
          websiteId,
          websiteVerificationId: expect.any(String),
        },
      });

      const verificationId = verificationBody.data.websiteVerificationId;

      expect(verificationId.length).toBeGreaterThan(0);
      expect(verificationId).not.toBe(failedVerificationId);

      const persistedVerification =
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: verificationId,
          },
        });

      expect(persistedVerification).toMatchObject({
        id: verificationId,
        websiteId,
        requestedByUserId: owner.id,
        type: 'DNS_TXT_RECORD',
        status: 'REQUESTED_FOR_MANUAL_REVIEW',
        verifiedBy: 'AUTOMATIC',
        screenshotImageKey: null,
        verifiedAt: null,
        verifiedDomain: null,
        errorMessage: null,
        responseData: null,
        manuallyReviewedByAdminUserId: null,
        manualReviewNotes: null,
        rejectReason: null,
      });

      expect(persistedVerification.createdAt).toBeInstanceOf(Date);
      expect(persistedVerification.updatedAt).toBeInstanceOf(Date);

      const failedVerificationAfterRequest =
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: failedVerificationId,
          },
        });

      expect(failedVerificationAfterRequest).toEqual(
        failedVerificationBeforeRequest,
      );

      const pendingWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(pendingWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        name: initialWebsite.name,
        websiteUrl: initialWebsite.websiteUrl,
        rootDomain: initialWebsite.rootDomain,
        verificationStatus: 'PENDING',
        latestVerificationId: verificationId,
        verifiedAt: null,
        verifiedMethod: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      console.log('TC_WF_014_MANUAL_REVIEW_REQUEST=PASS');

      const myRequestsResponse = await request.get(
        '/website-verification/my-requests?type=DNS_TXT_RECORD&status=REQUESTED_FOR_MANUAL_REVIEW&page=1&limit=10',
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        },
      );

      const myRequestsRawBody = await myRequestsResponse.text();

      expect(
        myRequestsResponse.status(),
        `Manual-review request listing produced HTTP ${myRequestsResponse.status()}: ${myRequestsRawBody.slice(0, 1000)}`,
      ).toBe(200);

      let myRequestsBody: any;

      try {
        myRequestsBody = JSON.parse(myRequestsRawBody);
      } catch {
        throw new Error(
          `Manual-review request listing produced non-JSON content: ${myRequestsRawBody.slice(0, 1000)}`,
        );
      }

      const myRequestItems = myRequestsBody?.data?.data;

      expect(Array.isArray(myRequestItems)).toBe(true);

      const listedVerification = myRequestItems.find(
        (item: any) => item.id === verificationId,
      );

      expect(listedVerification).toMatchObject({
        id: verificationId,
        type: 'DNS_TXT_RECORD',
        status: 'REQUESTED_FOR_MANUAL_REVIEW',
        website: {
          id: websiteId,
          websiteUrl: initialWebsite.websiteUrl,
          verificationStatus: 'PENDING',
        },
      });

      expect(
        myRequestItems.some((item: any) => item.id === failedVerificationId),
      ).toBe(false);

      console.log('TC_WF_014_READ_BACK=PASS');

      const duplicateResponse = await request.post(manualReviewRoute, {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
      });

      const duplicateRawBody = await duplicateResponse.text();

      expect(
        duplicateResponse.status(),
        `Duplicate manual-review request produced HTTP ${duplicateResponse.status()}: ${duplicateRawBody.slice(0, 1000)}`,
      ).toBe(400);

      expect(duplicateRawBody).toContain(
        'A manual review request is already pending',
      );

      expect(
        await prisma.websiteVerification.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(2);

      console.log('TC_WF_014_DUPLICATE_GUARD=PASS');

      const finalWebsite = await prisma.website.findUniqueOrThrow({
        where: {
          id: websiteId,
        },
        include: {
          matchingProfile: true,
          marketplaceCategories: true,
          marketplaceTags: true,
          creditWallet: true,
        },
      });

      expect(finalWebsite).toMatchObject({
        id: websiteId,
        authorId: owner.id,
        name: initialWebsite.name,
        websiteUrl: initialWebsite.websiteUrl,
        rootDomain: initialWebsite.rootDomain,
        verificationStatus: 'PENDING',
        latestVerificationId: verificationId,
        verifiedAt: null,
        verifiedMethod: null,
        isDeleted: false,
        matchingProfile: null,
        marketplaceCategories: [],
        marketplaceTags: [],
        creditWallet: null,
      });

      const finalVerificationIds = (
        await prisma.websiteVerification.findMany({
          where: {
            websiteId,
          },
          select: {
            id: true,
          },
        })
      )
        .map((verification) => verification.id)
        .sort();

      expect(finalVerificationIds).toEqual(
        [failedVerificationId, verificationId].sort(),
      );

      expect(
        await prisma.websiteVerification.findUniqueOrThrow({
          where: {
            id: failedVerificationId,
          },
        }),
      ).toEqual(failedVerificationBeforeRequest);

      expect(
        await prisma.websiteMatchingProfile.count({
          where: {
            websiteId,
          },
        }),
      ).toBe(0);

      expect(await prisma.website.count()).toBe(websitesBefore);
      expect(await prisma.websiteVerification.count()).toBe(
        verificationsBefore + 1,
      );
      expect(await prisma.websiteMatchingProfile.count()).toBe(
        matchingProfilesBefore,
      );

      console.log('TC_WF_014_NO_UNEXPECTED_SIDE_EFFECTS=PASS');
    } finally {
      await restoreManualReviewFixture();
    }
  });
});
