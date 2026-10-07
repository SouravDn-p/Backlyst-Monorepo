import { expect, test } from '@playwright/test';
import type { APIResponse } from '@playwright/test';
import { AdminAuthorizationSection } from '@prisma/client';
import {
  authHeaders,
  getCurrentUser,
  loginAdmin,
  loginUser,
} from '../helpers/auth-helper';
import {
  PLAYWRIGHT_AUTH_FIXTURES,
  PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS,
} from '../seed/authorization-fixtures';

function unwrapBodyData<T>(body: any): T {
  return (body?.data ?? body) as T;
}

function extractWebsiteItems(body: any): any[] {
  const data = unwrapBodyData<any>(body);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

async function parseJson(response: APIResponse) {
  try {
    return await response.json();
  } catch {
    return {
      raw: await response.text(),
    };
  }
}

test.describe.serial('Flow 4: Admin Authorization', () => {
  const createdAdminEmail = `pw-created-admin-${Date.now()}@e2e.com`;
  const createdUserEmail = `pw-created-user-${Date.now()}@e2e.com`;

  let superAdminToken = '';
  let websitesAdminToken = '';
  let noAccessAdminToken = '';
  let requesterToken = '';
  let managedWebsiteId = '';
  let superAdminId = '';
  let createdAdminId = '';

  test.beforeAll(async ({ request }) => {
    superAdminToken = (
      await loginAdmin(request, PLAYWRIGHT_AUTH_FIXTURES.users.superAdmin.email)
    ).accessToken;
    websitesAdminToken = (
      await loginAdmin(
        request,
        PLAYWRIGHT_AUTH_FIXTURES.users.websitesAdmin.email,
      )
    ).accessToken;
    noAccessAdminToken = (
      await loginAdmin(
        request,
        PLAYWRIGHT_AUTH_FIXTURES.users.noAccessAdmin.email,
      )
    ).accessToken;
    requesterToken = (await loginUser(request, 'pw-requester@e2e.com'))
      .accessToken;

    const superAdminMe = await getCurrentUser(request, superAdminToken);
    superAdminId = superAdminMe.id;

    const websitesResponse = await request.get('/website?limit=50', {
      headers: authHeaders(superAdminToken),
    });

    expect(websitesResponse.status()).toBe(200);

    const websitesBody = await websitesResponse.json();
    const websites = extractWebsiteItems(websitesBody);
    const managedWebsite = websites.find(
      (website) =>
        website.websiteUrl ===
        PLAYWRIGHT_AUTH_FIXTURES.websites.managed.websiteUrl,
    );

    expect(managedWebsite).toBeTruthy();
    managedWebsiteId = managedWebsite.id;
  });

  test('admin login accepts admin roles and rejects normal users', async ({
    request,
  }) => {
    expect(superAdminToken).toBeTruthy();
    expect(websitesAdminToken).toBeTruthy();
    expect(noAccessAdminToken).toBeTruthy();

    const rejectedResponse = await request.post('/auth/admin-login', {
      data: {
        email: 'pw-requester@e2e.com',
        password: 'password123',
      },
    });

    expect(rejectedResponse.status()).toBe(401);
    const rejectedBody = await parseJson(rejectedResponse);
    expect(String(rejectedBody.message ?? '')).toContain('Invalid Credentials');
  });

  test('auth me exposes frontend authorization metadata for admin users only', async ({
    request,
  }) => {
    const sectionsResponse = await request.get(
      '/admin/authorization/sections',
      {
        headers: authHeaders(superAdminToken),
      },
    );
    expect(sectionsResponse.status()).toBe(200);
    const sectionsBody = await sectionsResponse.json();
    const sections = unwrapBodyData<{ sections: string[] }>(
      sectionsBody,
    ).sections;

    const superAdminMe = await getCurrentUser(request, superAdminToken);
    expect(superAdminMe.role).toBe('SUPER_ADMIN');
    expect(superAdminMe.authorization.isSuperAdmin).toBe(true);
    expect(superAdminMe.authorization.permissions).toHaveLength(
      sections.length,
    );
    expect(superAdminMe.authorization.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: AdminAuthorizationSection.ADMIN_MANAGEMENT,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        }),
      ]),
    );

    const scopedAdminMe = await getCurrentUser(request, websitesAdminToken);
    expect(scopedAdminMe.role).toBe('ADMIN');
    expect(scopedAdminMe.authorization).toEqual({
      isSuperAdmin: false,
      permissions: [...PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS],
    });

    const noAccessAdminMe = await getCurrentUser(request, noAccessAdminToken);
    expect(noAccessAdminMe.role).toBe('ADMIN');
    expect(noAccessAdminMe.authorization).toEqual({
      isSuperAdmin: false,
      permissions: [],
    });

    const requesterMe = await getCurrentUser(request, requesterToken);
    expect(requesterMe.role).toBe('USER');
    expect(requesterMe.authorization).toBeUndefined();
  });

  test('super admin can browse admin authorization metadata and normal admins cannot', async ({
    request,
  }) => {
    const listAdminsResponse = await request.get(
      '/admin/authorization/admins',
      {
        headers: authHeaders(superAdminToken),
      },
    );

    expect(listAdminsResponse.status()).toBe(200);
    const listAdminsBody = await listAdminsResponse.json();
    const admins = unwrapBodyData<{ admins: any[] }>(listAdminsBody).admins;

    expect(admins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: PLAYWRIGHT_AUTH_FIXTURES.users.superAdmin.email,
          role: 'SUPER_ADMIN',
        }),
        expect.objectContaining({
          email: PLAYWRIGHT_AUTH_FIXTURES.users.websitesAdmin.email,
          role: 'ADMIN',
        }),
      ]),
    );

    const deniedResponse = await request.get('/admin/authorization/admins', {
      headers: authHeaders(websitesAdminToken),
    });

    expect(deniedResponse.status()).toBe(403);
  });

  test('super admin can create a scoped admin and duplicate email stays blocked', async ({
    request,
  }) => {
    const createResponse = await request.post('/admin/authorization/admins', {
      headers: authHeaders(superAdminToken),
      data: {
        name: 'Playwright Created Read Only Admin',
        email: createdAdminEmail,
        password: 'password123',
        permissions: [
          {
            section: AdminAuthorizationSection.WEBSITES,
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createdAdmin = unwrapBodyData<{ admin: any }>(createBody).admin;
    createdAdminId = createdAdmin.id;

    expect(createdAdmin.role).toBe('ADMIN');
    expect(createdAdmin.email).toBe(createdAdminEmail);

    const duplicateResponse = await request.post(
      '/admin/authorization/admins',
      {
        headers: authHeaders(superAdminToken),
        data: {
          name: 'Duplicate Read Only Admin',
          email: createdAdminEmail,
          password: 'password123',
        },
      },
    );

    expect(duplicateResponse.status()).toBe(409);
  });

  test('read-only admin can read website section but cannot mutate it until permissions change', async ({
    request,
  }) => {
    const createdAdminToken = (await loginAdmin(request, createdAdminEmail))
      .accessToken;

    const createdAdminMe = await getCurrentUser(request, createdAdminToken);
    expect(createdAdminMe.authorization).toEqual({
      isSuperAdmin: false,
      permissions: [
        {
          section: AdminAuthorizationSection.WEBSITES,
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      ],
    });

    const readResponse = await request.get('/website', {
      headers: authHeaders(createdAdminToken),
    });
    expect(readResponse.status()).toBe(200);

    const deniedUpdateResponse = await request.patch(
      `/website/${managedWebsiteId}/flag`,
      {
        headers: authHeaders(createdAdminToken),
      },
    );
    expect(deniedUpdateResponse.status()).toBe(403);
  });

  test('super admin can replace permissions and the new access takes effect immediately', async ({
    request,
  }) => {
    const replaceResponse = await request.put(
      `/admin/authorization/admins/${createdAdminId}/permissions`,
      {
        headers: authHeaders(superAdminToken),
        data: {
          permissions: [...PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS],
          reason: 'Grant update permission for website moderation.',
        },
      },
    );

    expect(replaceResponse.status()).toBe(200);
    const replaceBody = await replaceResponse.json();
    expect(
      unwrapBodyData<{ permissions: any[] }>(replaceBody).permissions,
    ).toEqual([...PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS]);

    const createdAdminToken = (await loginAdmin(request, createdAdminEmail))
      .accessToken;

    const allowedUpdateResponse = await request.patch(
      `/website/${managedWebsiteId}/flag`,
      {
        headers: authHeaders(createdAdminToken),
      },
    );

    expect(allowedUpdateResponse.status()).toBe(200);
    const allowedUpdateBody = await allowedUpdateResponse.json();
    expect(unwrapBodyData<any>(allowedUpdateBody)).toEqual(
      expect.objectContaining({
        id: managedWebsiteId,
        isFlag: true,
      }),
    );
  });

  test('admins without permission rows are denied protected dashboard sections', async ({
    request,
  }) => {
    const deniedWebsitesResponse = await request.get('/website', {
      headers: authHeaders(noAccessAdminToken),
    });
    expect(deniedWebsitesResponse.status()).toBe(403);

    const deniedVerificationResponse = await request.get(
      '/website-verification-admin/pending',
      {
        headers: authHeaders(noAccessAdminToken),
      },
    );
    expect(deniedVerificationResponse.status()).toBe(403);
  });

  test('super admin restrictions and legacy admin-create-user rules are enforced', async ({
    request,
  }) => {
    const deleteSuperAdminResponse = await request.delete(
      `/admin/authorization/admins/${superAdminId}`,
      {
        headers: authHeaders(superAdminToken),
      },
    );
    expect(deleteSuperAdminResponse.status()).toBe(403);

    const createSuperAdminResponse = await request.post(
      '/auth/admin-create-user',
      {
        headers: authHeaders(superAdminToken),
        data: {
          name: 'Forbidden Super Admin',
          email: `pw-forbidden-super-${Date.now()}@e2e.com`,
          password: 'password123',
          role: 'SUPER_ADMIN',
        },
      },
    );
    expect(createSuperAdminResponse.status()).toBe(400);

    const adminCreatesAdminResponse = await request.post(
      '/auth/admin-create-user',
      {
        headers: authHeaders(websitesAdminToken),
        data: {
          name: 'Forbidden Admin Creation',
          email: `pw-forbidden-admin-${Date.now()}@e2e.com`,
          password: 'password123',
          role: 'ADMIN',
        },
      },
    );
    expect(adminCreatesAdminResponse.status()).toBe(401);

    const createUserResponse = await request.post('/auth/admin-create-user', {
      headers: authHeaders(superAdminToken),
      data: {
        name: 'Playwright Admin Created User',
        email: createdUserEmail,
        password: 'password123',
        role: 'USER',
      },
    });
    expect(createUserResponse.status()).toBe(201);

    const createUserBody = await createUserResponse.json();
    expect(unwrapBodyData<{ result: any }>(createUserBody).result).toEqual(
      expect.objectContaining({
        email: createdUserEmail,
        role: 'USER',
      }),
    );
  });

  test('super admin can inspect, update, and delete a managed admin account', async ({
    request,
  }) => {
    const getAdminResponse = await request.get(
      `/admin/authorization/admins/${createdAdminId}`,
      {
        headers: authHeaders(superAdminToken),
      },
    );
    expect(getAdminResponse.status()).toBe(200);

    const getAdminBody = await getAdminResponse.json();
    expect(unwrapBodyData<{ admin: any }>(getAdminBody).admin).toEqual(
      expect.objectContaining({
        id: createdAdminId,
        authorization: {
          isSuperAdmin: false,
          permissions: [...PLAYWRIGHT_WEBSITES_MANAGER_PERMISSIONS],
        },
      }),
    );

    const updateAdminResponse = await request.patch(
      `/admin/authorization/admins/${createdAdminId}`,
      {
        headers: authHeaders(superAdminToken),
        data: {
          name: 'Playwright Updated Admin',
          country: 'Bangladesh',
        },
      },
    );
    expect(updateAdminResponse.status()).toBe(200);

    const updateAdminBody = await updateAdminResponse.json();
    expect(unwrapBodyData<{ admin: any }>(updateAdminBody).admin).toEqual(
      expect.objectContaining({
        id: createdAdminId,
        name: 'Playwright Updated Admin',
        country: 'Bangladesh',
      }),
    );

    const deleteAdminResponse = await request.delete(
      `/admin/authorization/admins/${createdAdminId}`,
      {
        headers: authHeaders(superAdminToken),
      },
    );
    expect(deleteAdminResponse.status()).toBe(200);

    const deletedAdminLoginResponse = await request.post('/auth/admin-login', {
      data: {
        email: createdAdminEmail,
        password: 'password123',
      },
    });
    expect(deletedAdminLoginResponse.status()).toBe(401);
  });
});
