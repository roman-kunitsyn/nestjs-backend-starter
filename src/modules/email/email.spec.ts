import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SMTPServer } from 'smtp-server';
import { renderEmail } from './email-templates.js';
import { SmtpEmailSender } from './email-sender.js';

describe('email delivery', () => {
  it('renders safe text and HTML for the required templates', () => {
    const templates = [
      'verify-email',
      'reset-password',
      'organization-invitation',
      'password-changed',
      'security-session-revoked',
    ] as const;
    for (const template of templates) {
      const message = renderEmail(template, {
        recipient: 'person@example.test',
        token: '<script>&"',
        organizationName: '<Acme>',
        userName: '<User>',
      });
      expect(message.text).toBeDefined();
      if (template !== 'organization-invitation')
        expect(message.html).toContain('&lt;User&gt;');
      expect(message.html).not.toContain('<script>');
      if (
        template === 'verify-email' ||
        template === 'reset-password' ||
        template === 'organization-invitation'
      )
        expect(message.html).toContain('&lt;script&gt;&amp;&quot;');
    }
  });

  it('authenticates to SMTP over validated TLS and sends both bodies', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'email-smtp-'));
    try {
      execFileSync(
        'openssl',
        [
          'req',
          '-x509',
          '-newkey',
          'rsa:2048',
          '-nodes',
          '-days',
          '1',
          '-keyout',
          join(directory, 'key.pem'),
          '-out',
          join(directory, 'cert.pem'),
          '-subj',
          '/CN=localhost',
          '-addext',
          'subjectAltName=IP:127.0.0.1',
        ],
        { stdio: 'ignore' },
      );
      const messages: string[] = [];
      const server = new SMTPServer({
        secure: true,
        key: readFileSync(join(directory, 'key.pem')),
        cert: readFileSync(join(directory, 'cert.pem')),
        authMethods: ['PLAIN'],
        onAuth(auth, _session, callback) {
          if (auth.username !== 'test-user' || auth.password !== 'test-pass') {
            callback(new Error('invalid credentials'));
            return;
          }
          callback(null, { user: auth.username });
        },
        onData(stream, _session, callback) {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            messages.push(Buffer.concat(chunks).toString());
            callback(null);
          });
        },
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.server.address();
      if (!address || typeof address === 'string')
        throw new Error('SMTP test server has no TCP address');
      try {
        const sender = new SmtpEmailSender({
          host: '127.0.0.1',
          port: address.port,
          secure: true,
          user: 'test-user',
          password: 'test-pass',
          from: 'sender@example.test',
          timeoutMs: 3000,
          ca: readFileSync(join(directory, 'cert.pem'), 'utf8'),
        });
        await sender.send({
          to: 'person@example.test',
          subject: 'Test',
          text: 'plain body',
          html: '<p>html body</p>',
        });
        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain('plain body');
        expect(messages[0]).toContain('html body');
      } finally {
        await new Promise<void>((resolve) => server.close(resolve));
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 20000);
});
