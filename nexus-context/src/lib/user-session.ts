export type UserRole = "member" | "owner" | "admin";

export interface UserSession {
    userId: string;
    role: UserRole;
}

export const USER_SESSION_STORAGE_KEY = "nexus.user-session";

export const DEFAULT_USER_SESSION: UserSession = {
    userId: "default-user",
    role: "member",
};

function isUserRole(value: unknown): value is UserRole {
    return value === "member" || value === "owner" || value === "admin";
}

export function normalizeUserSession(
    session: Partial<UserSession> | null | undefined,
): UserSession {
    const userId = session?.userId?.trim() || DEFAULT_USER_SESSION.userId;
    const role = isUserRole(session?.role) ? session.role : DEFAULT_USER_SESSION.role;

    return {
        userId,
        role,
    };
}

export function readStoredUserSession(): UserSession {
    if (typeof window === "undefined") {
        return DEFAULT_USER_SESSION;
    }

    try {
        const raw = window.localStorage.getItem(USER_SESSION_STORAGE_KEY);
        if (!raw) {
            return DEFAULT_USER_SESSION;
        }

        return normalizeUserSession(JSON.parse(raw) as Partial<UserSession>);
    } catch {
        return DEFAULT_USER_SESSION;
    }
}

export function writeStoredUserSession(
    session: Partial<UserSession> | UserSession,
): UserSession {
    const normalized = normalizeUserSession(session);

    if (typeof window !== "undefined") {
        window.localStorage.setItem(
            USER_SESSION_STORAGE_KEY,
            JSON.stringify(normalized),
        );
    }

    return normalized;
}
