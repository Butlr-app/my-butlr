import { extractInvitationToken, invitationUrl, isGuestToken } from './invitation';

const TOKEN = '123e4567-e89b-42d3-a456-426614174000';

describe('guest invitations', () => {
  it('accepts a raw UUID token', () => {
    expect(isGuestToken(TOKEN)).toBe(true);
    expect(extractInvitationToken(TOKEN.toUpperCase())).toBe(TOKEN);
  });

  it.each([
    `https://mybutlr.com/guest/stay/${TOKEN}`,
    `mybutlrguest://guest/stay/${TOKEN}`,
    `mybutlrguest://activate?token=${TOKEN}`,
  ])('extracts a token from %s', (url) => {
    expect(extractInvitationToken(url)).toBe(TOKEN);
  });

  it('rejects malformed and unrelated values', () => {
    expect(extractInvitationToken('')).toBeNull();
    expect(extractInvitationToken('not-a-token')).toBeNull();
    expect(extractInvitationToken('https://example.com/guest/stay/123')).toBeNull();
  });

  it('builds the web fallback invitation URL', () => {
    expect(invitationUrl(TOKEN)).toBe(`https://mybutlr.com/guest/stay/${TOKEN}`);
  });
});
