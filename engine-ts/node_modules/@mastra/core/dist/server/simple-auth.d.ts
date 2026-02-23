import type { HonoRequest } from 'hono';
import type { MastraAuthProviderOptions } from './auth.js';
import { MastraAuthProvider } from './auth.js';
type TokenToUser<TUser> = Record<string, TUser>;
export interface SimpleAuthOptions<TUser> extends MastraAuthProviderOptions<TUser> {
    /**
     * Valid tokens to authenticate against
     */
    tokens: TokenToUser<TUser>;
    /**
     * Headers to check for authentication
     * @default ['Authorization', 'X-Playground-Access']
     */
    headers?: string | string[];
}
export declare class SimpleAuth<TUser> extends MastraAuthProvider<TUser> {
    private tokens;
    private headers;
    private users;
    constructor(options: SimpleAuthOptions<TUser>);
    authenticateToken(token: string, request: HonoRequest): Promise<TUser | null>;
    authorizeUser(user: TUser, _request: HonoRequest): Promise<boolean>;
    private stripBearerPrefix;
    private getTokensFromHeaders;
}
export {};
//# sourceMappingURL=simple-auth.d.ts.map