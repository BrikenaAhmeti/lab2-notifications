import { env } from '../../../config/env';
import { ChatParticipantDirectory } from '../domain/chat-participant-directory';
import { ChatParticipantProfile } from '../domain/chat.entity';

type AuthProfilesResponse = {
    data?: ChatParticipantProfile[];
};

export class AuthUserDirectoryClient implements ChatParticipantDirectory {
    constructor(
        private readonly baseUrl = env.authServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async listByUserIds(userIds: string[]): Promise<Map<string, ChatParticipantProfile>> {
        const uniqueIds = [...new Set(userIds)].filter(Boolean);

        if (!uniqueIds.length || !this.baseUrl || !this.internalApiKey) {
            return new Map();
        }

        try {
            const url = new URL('/internal/users/profiles', this.baseUrl);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': this.internalApiKey,
                },
                body: JSON.stringify({ userIds: uniqueIds }),
            });

            if (!response.ok) {
                return new Map();
            }

            const payload = (await response.json()) as AuthProfilesResponse;
            const profiles = Array.isArray(payload.data) ? payload.data : [];

            return new Map(
                profiles
                    .map((profile) => normalizeProfile(profile))
                    .filter((profile): profile is ChatParticipantProfile => Boolean(profile))
                    .map((profile) => [profile.userId, profile]),
            );
        } catch {
            return new Map();
        }
    }
}

function normalizeProfile(profile: ChatParticipantProfile | null | undefined) {
    const userId = profile?.userId ?? profile?.id;

    if (!userId) {
        return null;
    }

    return {
        ...(profile ?? {}),
        id: profile?.id ?? userId,
        userId,
    };
}
