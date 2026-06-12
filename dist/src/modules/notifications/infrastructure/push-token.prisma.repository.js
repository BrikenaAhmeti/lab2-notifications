"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPushTokenRepository = void 0;
class PrismaPushTokenRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async register(input) {
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
    async unregister(userId, token) {
        await this.prisma.pushToken.deleteMany({
            where: { userId, token },
        });
    }
    async findByUserId(userId) {
        const tokens = await this.prisma.pushToken.findMany({
            where: { userId },
            select: { token: true },
        });
        return tokens.map(({ token }) => token);
    }
    async deleteByTokens(tokens) {
        if (tokens.length === 0)
            return;
        await this.prisma.pushToken.deleteMany({
            where: { token: { in: tokens } },
        });
    }
}
exports.PrismaPushTokenRepository = PrismaPushTokenRepository;
