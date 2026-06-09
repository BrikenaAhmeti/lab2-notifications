import { env } from '../../../config/env';
import { ChatParticipantDirectory } from '../domain/chat-participant-directory';
import { ChatParticipantProfile } from '../domain/chat.entity';

type AuthProfilesResponse = {
    data?: ChatParticipantProfile[];
};

type CoreStaffRecord = {
    id: string;
    userId?: string | null;
    user?: {
        id?: string;
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        roles?: string[];
        role?: string | null;
    } | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    employeeCode?: string | null;
    specialization?: string | null;
    positionType?: {
        name?: string | null;
        defaultRoleKey?: string | null;
    } | null;
};

type CoreStaffResponse = {
    items?: CoreStaffRecord[];
};

export class AuthUserDirectoryClient implements ChatParticipantDirectory {
    constructor(
        private readonly baseUrl = env.authServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
        private readonly coreServiceUrl = env.coreServiceUrl,
    ) {}

    async listByUserIds(userIds: string[]): Promise<Map<string, ChatParticipantProfile>> {
        const uniqueIds = [...new Set(userIds)].filter(Boolean);

        if (!uniqueIds.length) {
            return new Map();
        }

        const [authProfiles, staffProfiles] = await Promise.all([
            this.listAuthProfiles(uniqueIds),
            this.listStaffProfiles(uniqueIds),
        ]);

        for (const [userId, staffProfile] of staffProfiles) {
            authProfiles.set(userId, {
                ...(authProfiles.get(userId) ?? {}),
                ...staffProfile,
            });
        }

        return authProfiles;
    }

    private async listAuthProfiles(userIds: string[]) {
        if (!this.baseUrl || !this.internalApiKey) {
            return new Map<string, ChatParticipantProfile>();
        }

        try {
            const url = new URL('/internal/users/profiles', this.baseUrl);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': this.internalApiKey,
                },
                body: JSON.stringify({ userIds }),
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
            return new Map<string, ChatParticipantProfile>();
        }
    }

    private async listStaffProfiles(userIds: string[]) {
        if (!this.coreServiceUrl) {
            return new Map<string, ChatParticipantProfile>();
        }

        try {
            const url = new URL('/api/public/staff', this.coreServiceUrl);
            url.searchParams.set('page', '1');
            url.searchParams.set('limit', '100');
            url.searchParams.set('status', 'ACTIVE');

            const response = await fetch(url);

            if (!response.ok) {
                return new Map<string, ChatParticipantProfile>();
            }

            const payload = (await response.json()) as CoreStaffResponse;
            const allowedUserIds = new Set(userIds);
            const staff = Array.isArray(payload.items) ? payload.items : [];

            const profiles = staff
                .map((profile) => normalizeStaffProfile(profile))
                .filter((profile): profile is ChatParticipantProfile =>
                    Boolean(profile?.userId && allowedUserIds.has(profile.userId)),
                );

            return new Map(
                profiles.map((profile) => [profile.userId, profile]),
            );
        } catch {
            return new Map<string, ChatParticipantProfile>();
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

function normalizeRole(value?: string | null) {
    if (!value) return undefined;

    const key = value.trim().toLowerCase().replace(/[\s_-]+/g, '');

    if (key.includes('doctor') || key.includes('physician')) return 'doctor';
    if (key.includes('nurse')) return 'nurse';
    if (key.includes('reception')) return 'receptionist';
    if (key.includes('lab')) return 'lab_technician';
    if (key.includes('pharmac')) return 'pharmacist';
    if (key.includes('departmenthead')) return 'department_head';
    if (key.includes('admin')) return key.includes('super') ? 'super_admin' : 'admin';

    return 'staff';
}

function staffDisplayName(profile: CoreStaffRecord) {
    const userName = profile.user?.name;
    const userFullName = [profile.user?.firstName, profile.user?.lastName]
        .filter(Boolean)
        .join(' ');
    const profileFullName = [profile.firstName, profile.lastName]
        .filter(Boolean)
        .join(' ');
    const fallback = profile.email ?? profile.user?.email ?? profile.employeeCode ?? 'Staff member';

    return userName || userFullName || profileFullName || fallback;
}

function normalizeStaffProfile(profile: CoreStaffRecord | null | undefined): ChatParticipantProfile | null {
    const userId = profile?.userId ?? profile?.user?.id;

    if (!profile || !userId) {
        return null;
    }

    const role = normalizeRole(
        profile.positionType?.defaultRoleKey ??
        profile.positionType?.name ??
        profile.specialization ??
        profile.user?.role,
    );

    return {
        id: profile.id,
        userId,
        name: staffDisplayName(profile),
        firstName: profile.user?.firstName ?? profile.firstName ?? null,
        lastName: profile.user?.lastName ?? profile.lastName ?? null,
        email: profile.user?.email ?? profile.email ?? null,
        role,
        roles: profile.user?.roles ?? (role ? [role] : undefined),
    };
}
