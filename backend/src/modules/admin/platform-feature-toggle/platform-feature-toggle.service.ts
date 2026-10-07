import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import {
  PlatformFeatureToggleKeyDtoEnum,
  UpdatePlatformFeatureTogglesDto,
} from './dto/update-platform-feature-toggles.dto';

const DEFAULT_PLATFORM_FEATURE_TOGGLES = [
  {
    key: PlatformFeatureToggleKeyDtoEnum.USER_REVIEWS_RATINGS,
    label: 'User Reviews & Ratings',
    category: 'STAR-SIGNAL GOVERNANCE',
    enabled: true,
  },
  {
    key: PlatformFeatureToggleKeyDtoEnum.REFERRAL_ENGINE_INCENTIVES,
    label: 'Referral Engine & Incentives',
    category: 'CHAIN GOVERNANCE',
    enabled: true,
  },
  {
    key: PlatformFeatureToggleKeyDtoEnum.VISIBILITY_DISCOVERY_REWARDS,
    label: 'Visibility Discovery Rewards',
    category: 'DISCOVERY COMPLIANCE',
    enabled: true,
  },
  {
    key: PlatformFeatureToggleKeyDtoEnum.INTERNAL_ENTITY_MESSAGING,
    label: 'Internal Entity Messaging',
    category: 'REGULATED NODE',
    enabled: true,
  },
  {
    key: PlatformFeatureToggleKeyDtoEnum.EXTERNAL_NODE_API_ACCESS,
    label: 'External Node API Access',
    category: 'THIRD-PARTY PROVISIONING',
    enabled: false,
  },
  {
    key: PlatformFeatureToggleKeyDtoEnum.SELF_SERVICE_DISPUTE_CENTER,
    label: 'Self-Service Dispute Center',
    category: 'AUTOMATED RESOLUTION',
    enabled: true,
  },
];

type PlatformFeatureToggleRow = {
  key: string;
  label: string;
  category: string | null;
  enabled: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PlatformFeatureToggleDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PlatformFeatureToggleService {
  constructor(private readonly prisma: PrismaService) {}

  async getToggles() {
    await this.ensureDefaults();

    const toggles = await this.findAllToggles();

    return sendResponse('Platform feature toggles fetched successfully', {
      toggles,
    });
  }

  async updateToggles(payload: UpdatePlatformFeatureTogglesDto) {
    await this.ensureDefaults();

    await this.prisma.$transaction(
      payload.toggles.map((toggle) =>
        this.prisma.$executeRaw(Prisma.sql`
          UPDATE "PlatformFeatureToggle"
          SET "enabled" = ${toggle.enabled}, "updatedAt" = NOW()
          WHERE "key" = ${toggle.key}
        `),
      ),
    );

    const toggles = await this.findAllToggles();

    return sendResponse('Platform feature toggles updated successfully', {
      toggles,
    });
  }

  async isEnabled(
    key: PlatformFeatureToggleKeyDtoEnum,
    db: PlatformFeatureToggleDbClient = this.prisma,
  ) {
    await this.ensureDefaults(db);

    const rows = await db.$queryRaw<Array<{ enabled: boolean }>>(
      Prisma.sql`
        SELECT "enabled"
        FROM "PlatformFeatureToggle"
        WHERE "key" = ${key}
        LIMIT 1
      `,
    );

    return rows[0]?.enabled ?? false;
  }

  async ensureEnabled(
    key: PlatformFeatureToggleKeyDtoEnum,
    message = 'This platform feature is currently disabled.',
    db: PlatformFeatureToggleDbClient = this.prisma,
  ) {
    const enabled = await this.isEnabled(key, db);

    if (!enabled) {
      throw new ForbiddenException(message);
    }
  }

  private async ensureDefaults(
    db: PlatformFeatureToggleDbClient = this.prisma,
  ) {
    const writes = DEFAULT_PLATFORM_FEATURE_TOGGLES.map((toggle) =>
      db.$executeRaw(Prisma.sql`
          INSERT INTO "PlatformFeatureToggle" (
            "key",
            "label",
            "category",
            "enabled",
            "updatedAt"
          )
          VALUES (
            ${toggle.key},
            ${toggle.label},
            ${toggle.category},
            ${toggle.enabled},
            NOW()
          )
          ON CONFLICT ("key") DO UPDATE
          SET
            "label" = EXCLUDED."label",
            "category" = EXCLUDED."category",
            "updatedAt" = NOW()
        `),
    );

    if ('$transaction' in db) {
      await db.$transaction(writes);
      return;
    }

    await Promise.all(writes);
  }

  private async findAllToggles() {
    return this.prisma.$queryRaw<PlatformFeatureToggleRow[]>(Prisma.sql`
      SELECT
        "key",
        "label",
        "category",
        "enabled",
        "note",
        "createdAt",
        "updatedAt"
      FROM "PlatformFeatureToggle"
      ORDER BY "createdAt" ASC
    `);
  }
}
