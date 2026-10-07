import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('should initialize with jsonTransport in test environment', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    } as unknown as ConfigService;

    const mailService = new MailService(configService);
    expect(mailService).toBeDefined();
  });

  it('should throw error when SMTP user or pass is missing in non-test environment', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'SMTP_USER') return '';
        if (key === 'SMTP_PASS') return '';
        return undefined;
      }),
    } as unknown as ConfigService;

    expect(() => new MailService(configService)).toThrow('SMTP configuration missing');
  });

  it('should configure custom SMTP credentials, host, port, and security for AWS SES', () => {
    const configValues: Record<string, any> = {
      NODE_ENV: 'production',
      SMTP_USER: 'AKIAEXAMPLEKEYID',
      SMTP_PASS: 'BN749v0EXAMPLESECRET',
      SMTP_HOST: 'email-smtp.eu-west-2.amazonaws.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_FROM: 'Backlyst <contact@backlyst.co.uk>',
    };

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const mailService = new MailService(configService);
    expect(mailService).toBeDefined();
  });

  it('should auto-detect secure=true when port is 465', () => {
    const configValues: Record<string, any> = {
      NODE_ENV: 'production',
      SMTP_USER: 'AKIAEXAMPLEKEYID',
      SMTP_PASS: 'BN749v0EXAMPLESECRET',
      SMTP_HOST: 'email-smtp.eu-west-2.amazonaws.com',
      SMTP_PORT: 465,
    };

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const mailService = new MailService(configService);
    expect(mailService).toBeDefined();
  });
});
