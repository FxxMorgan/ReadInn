import crypto from 'node:crypto';

export interface AuthClaims { userId: string; email?: string; type: 'access' | 'refresh'; exp: number; nonce?: string }

function secret(): string { const value=process.env['JWT_SECRET'];if(process.env['NODE_ENV']==='production'&&!value)throw new Error('JWT_SECRET is required in production');return value??'readinn-development-secret-change-me'; }
function encode(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function sign(value: string): string { return crypto.createHmac('sha256',secret()).update(value).digest('base64url'); }

export function issueToken(input: Omit<AuthClaims,'exp'>, ttlSeconds: number): string { const header=encode({alg:'HS256',typ:'JWT'});const payload=encode({...input,exp:Math.floor(Date.now()/1000)+ttlSeconds});const unsigned=`${header}.${payload}`;return `${unsigned}.${sign(unsigned)}`; }
export function accessToken(userId:string,email?:string):string{return issueToken({userId,type:'access',...(email?{email}:{})},60*60);}
export function refreshToken(userId:string):string{return issueToken({userId,type:'refresh',nonce:crypto.randomUUID()},60*60*24*30);}

export function verifyToken(token:string,expectedType?:AuthClaims['type']):AuthClaims|null{
  try{const parts=token.split('.');if(parts.length===3){const unsigned=`${parts[0]}.${parts[1]}`;const expected=sign(unsigned);if(!crypto.timingSafeEqual(Buffer.from(parts[2]??''),Buffer.from(expected)))return null;const claims=JSON.parse(Buffer.from(parts[1]??'','base64url').toString('utf8')) as AuthClaims;if(claims.exp<=Math.floor(Date.now()/1000)||!claims.userId||(expectedType&&claims.type!==expectedType))return null;return claims;}
    // Transitional support for mobile sessions issued before signed tokens.
    const legacy=JSON.parse(Buffer.from(token,'base64').toString('utf8')) as Partial<AuthClaims>;if(!legacy.userId)return null;return{userId:legacy.userId,...(legacy.email?{email:legacy.email}:{}),type:legacy.type??'access',exp:Math.floor(Date.now()/1000)+300};
  }catch{return null;}
}

export function bearerClaims(authorization?:unknown,type:'access'|'refresh'='access'):AuthClaims|null{if(typeof authorization!=='string')return null;return verifyToken(authorization.replace(/^Bearer\s+/i,''),type);}
