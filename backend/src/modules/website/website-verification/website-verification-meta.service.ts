import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { sendResponse } from 'src/utils/sendResponse';
import { MailService } from 'src/common/utils/mail/mail.service';
import { ReferrerService } from 'src/modules/credit/referrer/referrer.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationType,
} from '@prisma/client';

interface MetaConfig {
  metaName: string;
  verificationToken: string;
}

interface FetchResult {
  html: string;
  verifiedDomain: string;
}

interface MetaVerificationResponseData {
  checkedAt: string;
  metaName: string;
  expectedToken: string;
  verifiedDomain?: string;
  isValid: boolean;
}

interface UpdateVerificationStatusParams {
  verificationId: string;
  websiteId: string;
  isValid: boolean;
  metaName: string;
  expectedToken: string;
  verifiedDomain?: string;
  errorMessage?: string;
}

// HTML meta tag verification uses Cheerio to parse raw HTML, which is fast and lightweight.
// However, this approach is less reliable in real-world environments because many websites
// are protected by anti-bot systems (e.g., Cloudflare, WAFs) that may block or alter server-side requests.
//
// As a result, verification may fail unless the user disables bot protection, firewall rules,
// or allows automated access to the website.
//
// In contrast, DNS TXT record verification is more stable and trustworthy because it is:
// - Not affected by web application firewalls or bot protection
// - Globally distributed and cached via DNS infrastructure
// - Less likely to be blocked or manipulated at request time
//
// For these reasons, DNS-based verification is generally preferred for production-grade verification flows.

@Injectable()
export class WebsiteVerificationMetaService {
  private readonly logger = new Logger(WebsiteVerificationMetaService.name);
  private readonly VERIFICATION_CONFIG_ID = 'WEBSITE_VERIFICATION_CONFIG';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly referrerService: ReferrerService,
    private readonly notificationService: NotificationService,
  ) {}

  async requestForMetaTagVerification(websiteId: string, userId: string) {
    const website = await this.getWebsiteOrThrow(websiteId, userId);

    if (website.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Website already verified');
    }

    await this.assertNoPendingVerification(websiteId);

    const metaConfig = await this.getMetaConfigOrThrow();

    const verification = await this.prisma.websiteVerification.create({
      data: {
        websiteId,
        requestedByUserId: userId,
        status: 'PENDING',
        type: 'HTML_META_TAG',
      },
    });

    let fetchResult: FetchResult | undefined;
    let isValid = false;
    let fetchError: Error | undefined;

    try {
      fetchResult = await this.fetchWebsiteHtml(website.websiteUrl);

      isValid = this.validateHtmlMetaTag(
        fetchResult.html,
        metaConfig.metaName,
        metaConfig.verificationToken,
      );
    } catch (error) {
      fetchError =
        error instanceof Error ? error : new Error('Website fetch failed');

      this.logger.warn(fetchError.message);
    }

    await this.updateVerificationStatus({
      verificationId: verification.id,
      websiteId: website.id,
      isValid,
      metaName: metaConfig.metaName,
      expectedToken: metaConfig.verificationToken,
      verifiedDomain: fetchResult?.verifiedDomain,
      errorMessage: fetchError?.message,
    });

    if (fetchError) {
      await this.sendVerificationResultEmail(website, false, fetchError);
      await this.sendVerificationNotification(website, false, verification.id, {
        reason:
          'Unable to access website. Check connectivity or bot protection settings.',
      });

      throw new BadRequestException(
        'Unable to access website. Check connectivity or bot protection settings.',
      );
    }

    await this.sendVerificationResultEmail(website, isValid);
    await this.sendVerificationNotification(website, isValid, verification.id, {
      reason: isValid ? null : 'Meta tag not found or invalid',
    });

    return sendResponse(
      isValid
        ? 'Website verified successfully'
        : 'Meta tag not found or invalid',
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
            ? 'Unable to access website. Check connectivity or bot protection settings.'
            : 'Meta tag not found or invalid',
        });

    if (!result.success) {
      const errorMessage =
        'error' in result ? result.error : 'Unknown email error';

      this.logger.error(
        `Failed to send meta verification ${isValid ? 'approved' : 'rejected'} email to ${website.author.email}: ${errorMessage}`,
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
          method: 'HTML_META_TAG',
          reason: data.reason,
        },
        idempotencyKey: `website-meta-${isValid ? 'verified' : 'failed'}-${verificationId}`,
      });
    } catch {
      // Verification result is already stored; notification failure should not
      // block the verification response.
    }
  }

  private async assertNoPendingVerification(websiteId: string) {
    const existing = await this.prisma.websiteVerification.findFirst({
      where: {
        websiteId,
        status: {
          in: ['PENDING', 'REQUESTED_FOR_MANUAL_REVIEW'],
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A verification request is already pending',
      );
    }
  }

  private async getMetaConfigOrThrow(): Promise<MetaConfig> {
    const config = await this.prisma.websiteVerificationConfig.findUnique({
      where: { id: this.VERIFICATION_CONFIG_ID },
      select: {
        metaName: true,
        verificationToken: true,
      },
    });

    if (!config) {
      throw new NotFoundException('Meta verification config not found');
    }

    return config;
  }

  private buildCandidateUrls(domain: string): string[] {
    if (/^https?:\/\//i.test(domain)) {
      return [domain];
    }

    return [`https://${domain}`, `http://${domain}`];
  }

  private async fetchWebsiteHtml(domain: string): Promise<FetchResult> {
    const deterministicFetchEnabled =
      process.env.NODE_ENV === 'test' &&
      process.env.ALLOW_E2E_META_TAG_FETCH === 'true';

    if (deterministicFetchEnabled) {
      const expectedUrl = process.env.E2E_META_TAG_URL;
      const deterministicHtml = process.env.E2E_META_TAG_HTML;

      if (!expectedUrl || !deterministicHtml) {
        throw new BadRequestException(
          'Deterministic meta-tag verification configuration is incomplete',
        );
      }

      if (domain !== expectedUrl) {
        throw new BadRequestException(
          `Unable to access website "${domain}" in deterministic test mode`,
        );
      }

      return {
        html: deterministicHtml,
        verifiedDomain: domain,
      };
    }

    const urls = this.buildCandidateUrls(domain);

    for (const url of urls) {
      try {
        const response = await axios.get<string>(url, {
          timeout: 10_000,
          maxRedirects: 5,
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Backlyst Verification Bot)',
          },
        });

        if (!response.data || typeof response.data !== 'string') continue;

        return {
          html: response.data,
          verifiedDomain: url,
        };
      } catch (_err) {
        this.logger.warn(`Failed to fetch ${url}`);
        continue;
      }
    }

    throw new BadRequestException(
      'Unable to access website. Try disabling bot protection or firewall restrictions.',
    );
  }

  private normalize(value: string) {
    return value?.trim().toLowerCase();
  }

  private validateHtmlMetaTag(
    html: string,
    metaName: string,
    token: string,
  ): boolean {
    const $ = cheerio.load(html);

    const targetName = this.normalize(metaName);
    const targetToken = token?.trim();

    return $('meta')
      .toArray()
      .some((el) => {
        const name = this.normalize($(el).attr('name') ?? '');
        const content = $(el).attr('content')?.trim();

        return name === targetName && content === targetToken;
      });
  }

  private async updateVerificationStatus(
    params: UpdateVerificationStatusParams,
  ): Promise<void> {
    const {
      verificationId,
      websiteId,
      isValid,
      metaName,
      expectedToken,
      verifiedDomain,
      errorMessage,
    } = params;

    const responseData: MetaVerificationResponseData = {
      checkedAt: new Date().toISOString(),
      metaName,
      expectedToken,
      verifiedDomain,
      isValid,
    };

    await this.prisma.$transaction(async (tx) => {
      //// ---code added by imran----- /////
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
      ///////////---------finish----------//////////
      await tx.websiteVerification.update({
        where: { id: verificationId },
        data: {
          status: isValid ? 'VERIFIED' : 'VERIFICATION_FAILED',
          verifiedAt: isValid ? new Date() : null,
          verifiedDomain: verifiedDomain ?? null,
          rejectReason: isValid ? null : 'Meta tag not found or invalid',
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
            verifiedMethod: 'HTML_META_TAG',
            latestVerificationId: verificationId,
          },
        });
        /////////---------added by imran ------------//////
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
        /////-------finish------//////
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
