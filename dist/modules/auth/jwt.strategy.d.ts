import { ConfigService } from '@nestjs/config';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    constructor(config: ConfigService);
    validate(payload: any): Promise<{
        id: any;
        sub: any;
        userId: any;
        email: any;
        role: any;
    }>;
}
export {};
