export type RegisterPushTokenInput = {
    userId: string;
    token: string;
    platform: 'android' | 'ios';
    deviceName?: string;
};

export interface PushTokenRepository {
    register(input: RegisterPushTokenInput): Promise<void>;
    unregister(userId: string, token: string): Promise<void>;
    findByUserId(userId: string): Promise<string[]>;
    deleteByTokens(tokens: string[]): Promise<void>;
}
