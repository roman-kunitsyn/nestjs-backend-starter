import Fastify from 'fastify';
import { parseTrustedProxyList } from '../../config/environment.js';

describe('Fastify trusted proxy configuration', () => {
  it('ignores spoofed forwarding headers by default and accepts them only from a trusted hop', async () => {
    const untrusted = Fastify({
      trustProxy: parseTrustedProxyList(''),
    });
    untrusted.get('/client-ip', (request) => ({ ip: request.ip }));
    await untrusted.ready();
    const ignored = await untrusted.inject({
      method: 'GET',
      url: '/client-ip',
      headers: { 'x-forwarded-for': '198.51.100.42' },
    });
    expect(ignored.json()).toEqual({ ip: '127.0.0.1' });
    await untrusted.close();

    const trusted = Fastify({
      trustProxy: parseTrustedProxyList('127.0.0.0/8'),
    });
    trusted.get('/client-ip', (request) => ({ ip: request.ip }));
    await trusted.ready();
    const resolved = await trusted.inject({
      method: 'GET',
      url: '/client-ip',
      headers: { 'x-forwarded-for': '198.51.100.42' },
    });
    expect(resolved.json()).toEqual({ ip: '198.51.100.42' });
    await trusted.close();
  });
});
