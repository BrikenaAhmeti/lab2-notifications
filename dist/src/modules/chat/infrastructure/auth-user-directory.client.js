"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUserDirectoryClient = void 0;
const env_1 = require("../../../config/env");
class AuthUserDirectoryClient {
    baseUrl;
    internalApiKey;
    coreServiceUrl;
    constructor(baseUrl = env_1.env.authServiceUrl, internalApiKey = env_1.env.internalApiKey, coreServiceUrl = env_1.env.coreServiceUrl) {
        this.baseUrl = baseUrl;
        this.internalApiKey = internalApiKey;
        this.coreServiceUrl = coreServiceUrl;
    }
    async listByUserIds(userIds) {
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
    async listAuthProfiles(userIds) {
        if (!this.baseUrl || !this.internalApiKey) {
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
                body: JSON.stringify({ userIds }),
            });
            if (!response.ok) {
                return new Map();
            }
            const payload = (await response.json());
            const profiles = Array.isArray(payload.data) ? payload.data : [];
            return new Map(profiles
                .map((profile) => normalizeProfile(profile))
                .filter((profile) => Boolean(profile))
                .map((profile) => [profile.userId, profile]));
        }
        catch {
            return new Map();
        }
    }
    async listStaffProfiles(userIds) {
        if (!this.coreServiceUrl) {
            return new Map();
        }
        try {
            const url = new URL('/api/public/staff', this.coreServiceUrl);
            url.searchParams.set('page', '1');
            url.searchParams.set('limit', '100');
            url.searchParams.set('status', 'ACTIVE');
            const response = await fetch(url);
            if (!response.ok) {
                return new Map();
            }
            const payload = (await response.json());
            const allowedUserIds = new Set(userIds);
            const staff = Array.isArray(payload.items) ? payload.items : [];
            const profiles = staff
                .map((profile) => normalizeStaffProfile(profile))
                .filter((profile) => Boolean(profile?.userId && allowedUserIds.has(profile.userId)));
            return new Map(profiles.map((profile) => [profile.userId, profile]));
        }
        catch {
            return new Map();
        }
    }
}
exports.AuthUserDirectoryClient = AuthUserDirectoryClient;
function normalizeProfile(profile) {
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
function normalizeRole(value) {
    if (!value)
        return undefined;
    const key = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (key.includes('doctor') || key.includes('physician'))
        return 'doctor';
    if (key.includes('nurse'))
        return 'nurse';
    if (key.includes('reception'))
        return 'receptionist';
    if (key.includes('lab'))
        return 'lab_technician';
    if (key.includes('pharmac'))
        return 'pharmacist';
    if (key.includes('departmenthead'))
        return 'department_head';
    if (key.includes('admin'))
        return key.includes('super') ? 'super_admin' : 'admin';
    return 'staff';
}
function staffDisplayName(profile) {
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
function normalizeStaffProfile(profile) {
    const userId = profile?.userId ?? profile?.user?.id;
    if (!profile || !userId) {
        return null;
    }
    const role = normalizeRole(profile.positionType?.defaultRoleKey ??
        profile.positionType?.name ??
        profile.specialization ??
        profile.user?.role);
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
