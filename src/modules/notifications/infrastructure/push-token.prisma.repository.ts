import { PrismaClient } from '../../../generated/prisma';
import {
    PushTokenRepository,
    RegisterPushTokenInput,
} from '../domain/push-token.repository';

export class PrismaPushTokenRepository implements PushTokenRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async register(input: RegisterPushTokenInput): Promise<void> {
        await this.prisma.pushToken.upsert({
            where: { token: input.token },
            create: input,
            update: {
                userId: input.userId,
                platform: input.platform,
                deviceName: input.deviceName,
            },
        });
    }

    async unregister(userId: string, token: string): Promise<void> {
        await this.prisma.pushToken.deleteMany({
            where: { userId, token },
        });
    }

    async findByUserId(userId: string): Promise<string[]> {
        const tokens = await this.prisma.pushToken.findMany({
            where: { userId },
            select: { token: true },
        });

        return tokens.map(({ token }) => token);
    }

    async deleteByTokens(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;

        await this.prisma.pushToken.deleteMany({
            where: { token: { in: tokens } },
        });
    }
}
