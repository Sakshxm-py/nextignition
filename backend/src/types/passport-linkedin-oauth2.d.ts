declare module 'passport-linkedin-oauth2' {
    import { Strategy as PassportStrategy } from 'passport';

    interface Profile {
        id: string;
        displayName: string;
        name: { familyName: string; givenName: string };
        emails: Array<{ value: string }>;
        photos: Array<{ value: string }>;
        _json: Record<string, any>;
        [key: string]: any;
    }

    interface StrategyOptions {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
        scope?: string[];
        state?: boolean;
        [key: string]: any;
    }

    type VerifyCallback = (err: any, user?: any, info?: any) => void;
    type VerifyFunction = (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
    ) => void;

    class Strategy extends PassportStrategy {
        constructor(options: StrategyOptions, verify: VerifyFunction);
        name: string;
    }
}
