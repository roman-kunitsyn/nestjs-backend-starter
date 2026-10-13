import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

/** Development-only adapter; token links are intentionally visible only locally. */
@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `Development email to ${message.to}: ${message.subject}\n${message.text}`,
    );
  }
}

/** Deterministic adapter for application tests. */
@Injectable()
export class InMemoryEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  timeoutMs: number;
  ca?: string;
}

/** Authenticated SMTP transport with certificate validation and bounded socket timeouts. */
@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly transport: Transporter;

  constructor(config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: { user: config.user, pass: config.password },
      tls: {
        rejectUnauthorized: true,
        ...(config.ca ? { ca: config.ca } : {}),
      },
      connectionTimeout: config.timeoutMs,
      greetingTimeout: config.timeoutMs,
      socketTimeout: config.timeoutMs,
    });
    this.from = config.from;
  }

  private readonly from: string;

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({ ...message, from: this.from });
  }
}
