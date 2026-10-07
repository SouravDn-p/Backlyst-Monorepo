import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { resolveTxt } from 'node:dns/promises';
import { PrismaService } from 'src/prisma/prisma.service';
import { sendResponse } from 'src/utils/sendResponse';
import { MailService } from 'src/common/utils/mail/mail.service';
import { ReferrerService } from 'src/modules/credit/referrer/referrer.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

interface DnsConfig {
  metaName: string;
  verificationToken: string;
}

interface DnsVerificationResponseData {
  checkedAt: string;
  expected: string;
  actual: string[];
  isValid: boolean;
}

interface UpdateVerificationStatusParams {
  verificationId: string;
  websiteId: string;
  isValid: boolean;
  expectedRecord: string;
  records?: string[];
  errorMessage?: string;
}

const WEBSITE_VERIFICATION_CONFIG_ID = 'WEBSITE_VERIFICATION_CONFIG';

// DNS TXT record is the most reliable and trustworthy method for verifying a website in this platform.
//
// Unlike HTML-based verification, DNS verification is not affected by web servers, frontend changes,
// or anti-bot systems (e.g., Cloudflare or WAF protection).
//
// However, DNS propagation is not instantaneous. Changes to DNS TXT records may take time to
// propagate across global DNS resolvers, typically up to 48 hours in some cases.
//
// During this propagation period, the website verification status will remain in a PENDING state.
// Once the DNS TXT record becomes visible and matches the expected value, the verification will
// automatically transition to SUCCESS. If it never matches, it will eventually be marked as FAILED
// after verification attempts or retry cycles are completed.
@Injectable()
export class WebsiteVerificationDnsService {
  private readonly logger = new Logger(WebsiteVerificationDnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly referrerService: ReferrerService,
    private readonly notificationService: NotificationService,
  ) {}

  async requestForDnsVerification(websiteId: string, userId: string) {
    const website = await this.getWebsiteOrThrow(websiteId, userId);

    const config = await this.getDnsConfigOrThrow();
    const expectedRecord = this.buildExpectedRecord(config);

    let records: string[] | undefined;
    let isValid = false;
    let fetchError: Error | undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.websiteVerification.findFirst({
        where: {
          websiteId,
          status: {
            in: ['PENDING', 'REQUESTED_FOR_MANUAL_REVIEW'],
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'A verification request is already pending',
        );
      }

      const verification = await tx.websiteVerification.create({
        data: {
          websiteId,
          requestedByUserId: userId,
          status: 'PENDING',
          type: 'DNS_TXT_RECORD',
        },
      });

      return verification;
    });

    try {
      records = await this.fetchDnsTxtRecords(
        website.websiteUrl,
        config.metaName,
      );

      isValid = this.validateDnsRecord(records, expectedRecord);
    } catch (error) {
      fetchError =
        error instanceof Error ? error : new Error('DNS lookup failed');
      this.logger.warn(fetchError.message);
    }

    await this.updateVerificationStatus({
      verificationId: result.id,
      websiteId: website.id,
      isValid,
      expectedRecord,
      records,
      errorMessage: fetchError?.message,
    });

    if (fetchError) {
      await this.sendVerificationResultEmail(website, false, fetchError);
      await this.sendVerificationNotification(website, false, result.id, {
        reason:
          'Unable to fetch DNS TXT records. Ensure the record is published and try again.',
      });

      throw new BadRequestException(
        'Unable to fetch DNS TXT records. Ensure the record is published and try again.',
      );
    }

    await this.sendVerificationResultEmail(website, isValid);
    await this.sendVerificationNotification(website, isValid, result.id, {
      reason: isValid
        ? null
        : 'DNS TXT record not found or invalid. DNS propagation may take up to 48 hours.',
    });

    return sendResponse(
      isValid
        ? 'DNS verification successful'
        : 'DNS TXT record not found or invalid. DNS propagation may take up to 48 hours.',
      { success: isValid },
    );
  }

  private async getWebsiteOrThrow(websiteId: string, userId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        authorId: true,
        name: true,
        isDeleted: true,
        websiteUrl: true,
        verificationStatus: true,
        author: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!website || website.isDeleted) {
      throw new NotFoundException('Website not found');
    }

    if (website.authorId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to verify this website',
      );
    }

    if (website.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Website already verified');
    }

    return website;
  }

  private async sendVerificationResultEmail(
    website: {
      name: string;
      websiteUrl: string;
      author: {
        email: string;
        name: string;
      };
    },
    isValid: boolean,
    fetchError?: Error,
  ) {
    const result = isValid
      ? await this.mail.sendWebsiteApprovedEmail(website.author.email, {
          ownerName: website.author.name,
          websiteName: website.name,
          websiteUrl: website.websiteUrl,
        })
      : await this.mail.sendWebsiteRejectedEmail(website.author.email, {
          ownerName: website.author.name,
          websiteName: website.name,
          websiteUrl: website.websiteUrl,
          rejectionReason: fetchError
            ? 'Unable to fetch DNS TXT records. Ensure the record is published and try again.'
            : 'DNS TXT record not found or invalid. DNS propagation may take up to 48 hours.',
        });

    if (!result.success) {
      const errorMessage =
        'error' in result ? result.error : 'Unknown email error';

      this.logger.error(
        `Failed to send DNS verification ${isValid ? 'approved' : 'rejected'} email to ${website.author.email}: ${errorMessage}`,
      );
    }
  }

  private async sendVerificationNotification(
    website: {
      id: string;
      authorId: string;
      name: string;
      websiteUrl: string;
    },
    isValid: boolean,
    verificationId: string,
    data: { reason: string | null },
  ) {
    try {
      await this.notificationService.sendNotification({
        recipientId: website.authorId,
        type: isValid
          ? NotificationType.WEBSITE_VERIFIED
          : NotificationType.WEBSITE_REJECTED,
        category: NotificationCategory.SECURITY,
        entityType: NotificationEntityType.WEBSITE,
        entityId: website.id,
        title: isValid ? 'Website verified' : 'Website verification failed',
        body: isValid
          ? `${website.name} has been verified successfully.`
          : `${website.name} verification failed.`,
        data: {
          websiteId: website.id,
          websiteName: website.name,
          websiteUrl: website.websiteUrl,
          verificationId,
          method: 'DNS_TXT_RECORD',
          reason: data.reason,
        },
        idempotencyKey: `website-dns-${isValid ? 'verified' : 'failed'}-${verificationId}`,
      });
    } catch {
      // Verification result is already stored; notification failure should not
      // block the verification response.
    }
  }

  private async getDnsConfigOrThrow(): Promise<DnsConfig> {
    const config = await this.prisma.websiteVerificationConfig.findUnique({
      where: { id: WEBSITE_VERIFICATION_CONFIG_ID },
      select: {
        metaName: true,
        verificationToken: true,
      },
    });

    if (!config) {
      throw new NotFoundException('DNS configuration not found');
    }

    return config;
  }

  private extractDomain(url: string): string {
    try {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

      return new URL(normalized).hostname.toLowerCase();
    } catch {
      throw new BadRequestException('Invalid website URL');
    }
  }

  private buildExpectedRecord(config: DnsConfig): string {
    return `${config.metaName}=${config.verificationToken}`;
  }

  private async fetchDnsTxtRecords(
    websiteUrl: string,
    metaName: string,
  ): Promise<string[]> {
    const hostname = this.extractDomain(websiteUrl);
    const lookupName = `${metaName}.${hostname}`;

    try {
      const records = await this.resolveDnsTxtRecords(lookupName);

      // Proper TXT flattening
      return records.map((r) => r.join(''));
    } catch {
      throw new BadRequestException(
        `Unable to fetch DNS TXT records for "${lookupName}"`,
      );
    }
  }

  private async resolveDnsTxtRecords(lookupName: string): Promise<string[][]> {
    const deterministicE2EEnabled =
      process.env.NODE_ENV === 'test' &&
      process.env.ALLOW_E2E_DNS_RESOLUTION === 'true';

    if (!deterministicE2EEnabled) {
      return resolveTxt(lookupName);
    }

    const allowedLookupName = process.env.E2E_DNS_LOOKUP_NAME;
    const deterministicRecord = process.env.E2E_DNS_TXT_RECORD;

    if (!allowedLookupName || !deterministicRecord) {
      throw new Error('Deterministic E2E DNS configuration is incomplete');
    }

    if (lookupName !== allowedLookupName) {
      throw new BadRequestException(
        `Unable to fetch DNS TXT records for "${lookupName}"`,
      );
    }

    return [[deterministicRecord]];
  }

  private normalize(value: string) {
    return value.replace(/"/g, '').trim().toLowerCase();
  }

  private validateDnsRecord(
    records: string[],
    expectedRecord: string,
  ): boolean {
    const expected = this.normalize(expectedRecord);

    return records.some((r) => this.normalize(r) === expected);
  }

  private async updateVerificationStatus(
    params: UpdateVerificationStatusParams,
  ): Promise<void> {
    const {
      verificationId,
      websiteId,
      isValid,
      expectedRecord,
      records,
      errorMessage,
    } = params;

    const responseData: DnsVerificationResponseData = {
      checkedAt: new Date().toISOString(),
      expected: expectedRecord,
      actual: records ?? [],
      isValid,
    };

    await this.prisma.$transaction(async (tx) => {
      //////added by imran /////
      const website = await tx.website.findUnique({
        where: { id: websiteId },
        select: {
          id: true,
          authorId: true,
        },
      });

      if (!website) {
        throw new Error('Website not found');
      }
      ///////////finish////////
      await tx.websiteVerification.update({
        where: { id: verificationId },
        data: {
          status: isValid ? 'VERIFIED' : 'VERIFICATION_FAILED',
          verifiedAt: isValid ? new Date() : null,
          rejectReason: isValid ? null : 'DNS TXT record not found or invalid',
          errorMessage: errorMessage ?? null,
          responseData: JSON.stringify(responseData),
        },
      });

      if (isValid) {
        await tx.website.update({
          where: { id: websiteId },
          data: {
            verificationStatus: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedMethod: 'DNS_TXT_RECORD',
            latestVerificationId: verificationId,
          },
        });
        //////added by imran /////
        await tx.websiteMatchingProfile.upsert({
          where: { websiteId: website.id },
          update: {},
          create: {
            websiteId: website.id,
            userId: website.authorId,
            visibilityScore: 50,
            opportunityScore: 50,
            reputationScore: 50,
            internalPriorityScore: 50,
            reliabilityScore: 50,
            riskScore: 0,
            diversityScore: 50,
            firstSuccessBoostActive: true,
          },
        });
        //////finish /////
      } else {
        await tx.website.update({
          where: { id: websiteId },
          data: {
            verificationStatus: 'VERIFICATION_FAILED',
            latestVerificationId: verificationId,
          },
        });
      }
    });

    if (isValid) {
      const website = await this.prisma.website.findUnique({
        where: {
          id: websiteId,
        },
        select: {
          authorId: true,
        },
      });

      if (website) {
        // Referral credit purpose: website verification unlocks Stage 1 referral rewards.
        await this.referrerService.unlockWebsiteVerifiedStage(
          website.authorId,
          websiteId,
        );
      }
    }
  }
}
