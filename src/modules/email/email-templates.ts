import type { EmailMessage } from './email-sender.js';

export type EmailTemplate =
  | 'verify-email'
  | 'reset-password'
  | 'organization-invitation'
  | 'password-changed'
  | 'security-session-revoked';

export interface TemplateInput {
  recipient: string;
  token?: string;
  organizationName?: string;
  userName?: string;
  occurredAt?: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );

export function renderEmail(
  template: EmailTemplate,
  input: TemplateInput,
): EmailMessage {
  const token = input.token ?? '';
  const organization = escapeHtml(input.organizationName ?? 'an organization');
  const name = escapeHtml(input.userName ?? input.recipient);
  const content: Record<
    EmailTemplate,
    { subject: string; text: string; html: string }
  > = {
    'verify-email': {
      subject: 'Verify your email',
      text: `Hello ${name}, verify your email with this token: ${token}`,
      html: `<p>Hello ${name},</p><p>Verify your email with this token:</p><p>${escapeHtml(token)}</p>`,
    },
    'reset-password': {
      subject: 'Reset your password',
      text: `Hello ${name}, reset your password with this token: ${token}`,
      html: `<p>Hello ${name},</p><p>Reset your password with this token:</p><p>${escapeHtml(token)}</p>`,
    },
    'organization-invitation': {
      subject: `Invitation to join ${input.organizationName ?? 'an organization'}`,
      text: `You were invited to join ${input.organizationName ?? 'an organization'}. Invitation token: ${token}`,
      html: `<p>You were invited to join ${organization}.</p><p>Invitation token: ${escapeHtml(token)}</p>`,
    },
    'password-changed': {
      subject: 'Your password was changed',
      text: `Hello ${name}, your password was changed. If this was not you, contact support.`,
      html: `<p>Hello ${name},</p><p>Your password was changed. If this was not you, contact support.</p>`,
    },
    'security-session-revoked': {
      subject: 'A security session was revoked',
      text: `Hello ${name}, a session was revoked${input.occurredAt ? ` at ${input.occurredAt}` : ''}.`,
      html: `<p>Hello ${name},</p><p>A session was revoked${input.occurredAt ? ` at ${escapeHtml(input.occurredAt)}` : ''}.</p>`,
    },
  };
  return { to: input.recipient, ...content[template] };
}
