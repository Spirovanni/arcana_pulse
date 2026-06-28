const revokedTokenExpiries = new Map<string, number>();

function pruneExpiredRevocations(nowUnix = Math.floor(Date.now() / 1000)): void {
  for (const [jti, exp] of revokedTokenExpiries.entries()) {
    if (exp <= nowUnix) {
      revokedTokenExpiries.delete(jti);
    }
  }
}

export function revokeMobileToken(jti: string, exp: number): void {
  pruneExpiredRevocations();
  revokedTokenExpiries.set(jti, exp);
}

export function isMobileTokenRevoked(jti: string): boolean {
  pruneExpiredRevocations();
  return revokedTokenExpiries.has(jti);
}
