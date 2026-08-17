import crypto from 'node:crypto';

export interface AuthClaims { userId: string; email?: string; type: 'access' | 'refresh'; exp: number; nonce?: string }

let configuredSecret: string | undefined;

export function configureAuth(options: { jwtSecret?: string }): void {
  configuredSecret = options.jwtSecret;
}

function secret(): string {
  const value = configuredSecret ?? process.env['JWT_SECRET'];
  if (!value) throw new Error('JWT_SECRET is required outside fixture mode');
  return value;
}
function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function sign(value: string): string { return crypto.createHmac('sha256',secret()).update(value).digest('base64url'); }

export function issueToken(input: Omit<AuthClaims,'exp'>, ttlSeconds: number): string { const header=encode({alg:'HS256',typ:'JWT'});const payload=encode({...input,exp:Math.floor(Date.now()/1000)+ttlSeconds});const unsigned=`${header}.${payload}`;return `${unsigned}.${sign(unsigned)}`; }
export function accessToken(userId:string,email?:string):string{return issueToken({userId,type:'access',...(email?{email}:{})},60*60);}
export function refreshToken(userId:string):string{return issueToken({userId,type:'refresh',nonce:crypto.randomUUID()},60*60*24*30);}

export function verifyToken(token:string,expectedType?:AuthClaims['type']):AuthClaims|null{
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const unsigned = `${parts[0]}.${parts[1]}`;
    const expected = Buffer.from(sign(unsigned), 'base64url');
    const signature = Buffer.from(parts[2] ?? '', 'base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) return null;
    const claims = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as AuthClaims;
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof claims.userId !== 'string' || !claims.userId) return null;
    if (claims.type !== 'access' && claims.type !== 'refresh') return null;
    if (expectedType && claims.type !== expectedType) return null;
    return claims;
  } catch {
    return null;
  }
}

export function bearerClaims(authorization?:unknown,type:'access'|'refresh'='access'):AuthClaims|null{if(typeof authorization!=='string')return null;return verifyToken(authorization.replace(/^Bearer\s+/i,''),type);}
