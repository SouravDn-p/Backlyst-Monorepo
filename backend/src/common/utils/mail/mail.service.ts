import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { SendMailOptions } from 'src/types';
import type { TemplateDelegate } from 'handlebars';
import { formatDate } from '../date.util';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  private templateCache = new Map<string, TemplateDelegate>();
  private layoutCache = new Map<string, TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    this.transporter = this.createTransporter();
  }

  // -------------------------
  // Transporter
  // -------------------------
  private createTransporter() {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return nodemailer.createTransport({
        jsonTransport: true,
      });
    }

    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const host = this.configService.get<string>('SMTP_HOST');

    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP configuration missing');
    }

    if (!host) {
      throw new Error('SMTP configuration missing: SMTP_HOST is required');
    }
    const port = Number(this.configService.get<string | number>('SMTP_PORT') ?? 587);
    const secureConfig = this.configService.get<string | boolean>('SMTP_SECURE');
    const secure =
      secureConfig !== undefined
        ? String(secureConfig).toLowerCase() === 'true'
        : port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // -------------------------
  // Path resolver (safe)
  // -------------------------
  private getTemplateBasePath() {
    const distTemplatePath = path.resolve(__dirname, '../../../../templates');
    const srcTemplatePath = path.resolve(__dirname, '../../../templates');

    return fs.existsSync(distTemplatePath) ? distTemplatePath : srcTemplatePath;
  }

  private getTemplatePath(name: string) {
    return path.resolve(this.getTemplateBasePath(), `${name}.hbs`);
  }

  private getLayoutPath() {
    return path.resolve(this.getTemplateBasePath(), 'layouts', 'main.hbs');
  }

  // -------------------------
  // Render template
  // -------------------------
  private renderTemplate(templateName: string, context: Record<string, any>) {
    const templatePath = this.getTemplatePath(templateName);
    const layoutPath = this.getLayoutPath();

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    if (!fs.existsSync(layoutPath)) {
      throw new Error(`Layout not found: ${layoutPath}`);
    }

    // -------------------------
    // Template cache (mtime-based)
    // -------------------------
    const templateStat = fs.statSync(templatePath);
    const templateKey = `${templateName}:${templateStat.mtimeMs}`;

    let template = this.templateCache.get(templateKey);

    if (!template) {
      template = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
      this.templateCache.set(templateKey, template);
    }

    // -------------------------
    // Layout cache (mtime-based too)
    // -------------------------
    const layoutStat = fs.statSync(layoutPath);
    const layoutKey = `main:${layoutStat.mtimeMs}`;

    let layout = this.layoutCache.get(layoutKey);

    if (!layout) {
      layout = handlebars.compile(fs.readFileSync(layoutPath, 'utf8'));
      this.layoutCache.set(layoutKey, layout);
    }

    // -------------------------
    // normalized system variables
    // -------------------------
    const meta = {
      title: context.title,
      headerTitle: context.headerTitle,
      companyName: this.configService.get<string>('COMPANY_NAME') ?? 'Backlyst',
      year: new Date().getFullYear(),
    };

    const body = template(context);

    if (context.plainEmail) {
      return `
        <!doctype html>
        <html>
          <body>
            ${body}
          </body>
        </html>
      `;
    }

    return layout({
      body,
      ...meta,
    });
  }

  // -------------------------
  // Send mail
  // -------------------------
  async sendMail({ to, subject, html }: SendMailOptions) {
    try {
      const from =
        this.configService.get<string>('SMTP_FROM') ??
        this.configService.get<string>('SMTP_USER');

      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      return { success: true, info };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email failed',
      };
    }
  }

  // -------------------------
  // Emails
  // -------------------------
  async sendVerificationEmail(to: string, payload: any) {
    return this.sendMail({
      to,
      subject: 'Verify your account',
      html: this.renderTemplate('otp', payload),
    });
  }

  async sendPasswordResetEmail(to: string, payload: any) {
    return this.sendMail({
      to,
      subject: 'Reset your password',
      html: this.renderTemplate('reset-password', {
        ...payload,
        greeting: `Hello ${payload.name},`,
      }),
    });
  }

  async sendBannedUserEmail(
    to: string,
    payload: { name: string; reason: string },
  ) {
    const companyName =
      this.configService.get<string>('COMPANY_NAME') ?? 'Backlyst';
    return this.sendMail({
      to,
      subject: 'Account Banned Notification',
      html: this.renderTemplate('ban-user', {
        ...payload,
        greeting: `Dear ${payload.name},`,
        signature: `Regards,<br />\n<strong>${companyName} Team</strong>`,
      }),
    });
  }

  async sendSuspendedUserEmail(
    to: string,
    payload: {
      name: string;
      reason: string;
      suspendStart: string;
      suspendEnd: string;
      durationInDays?: number;
    },
  ) {
    const suspendStart = formatDate(payload.suspendStart);

    const suspendEnd = formatDate(payload.suspendEnd);

    const companyName =
      this.configService.get<string>('COMPANY_NAME') ?? 'Backlyst';

    return this.sendMail({
      to,
      subject: 'Account Suspended Notification',
      html: this.renderTemplate('suspend-user', {
        ...payload,
        suspendStart,
        suspendEnd,
        greeting: `Hello ${payload.name},`,
        signature: `Regards,<br/>\n${companyName} Team`,
      }),
    });
  }

  async sendWebsiteApprovedEmail(
    to: string,
    payload: {
      ownerName: string;
      websiteName: string;
      websiteUrl: string;
      manualReviewNotes?: string;
    },
  ) {
    return this.sendMail({
      to,
      subject: 'Your Website Has Been Verified',
      html: this.renderTemplate('website-verification-approved', {
        ...payload,
        plainEmail: true,
        title: 'Website Verification Approved',
        headerTitle: 'Website Approved',
      }),
    });
  }

  async sendWebsiteRejectedEmail(
    to: string,
    payload: {
      ownerName: string;
      websiteName: string;
      websiteUrl: string;
      rejectionReason: string;
      manualReviewNotes?: string;
    },
  ) {
    return this.sendMail({
      to,
      subject: 'Website Verification Rejected',
      html: this.renderTemplate('website-verification-rejected', {
        ...payload,
        plainEmail: true,
        title: 'Website Verification Rejected',
        headerTitle: 'Verification Rejected',
      }),
    });
  }
}
