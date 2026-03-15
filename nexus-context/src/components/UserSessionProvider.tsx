import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
    DEFAULT_USER_SESSION,
    USER_SESSION_STORAGE_KEY,
    readStoredUserSession,
    writeStoredUserSession,
    type UserSession,
} from "../lib/user-session";
import { UserSessionContext } from "./user-session-context";

export function UserSessionProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [session, setSession] = useState<UserSession>(() => readStoredUserSession());

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === USER_SESSION_STORAGE_KEY) {
                setSession(readStoredUserSession());
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const updateSession = useCallback(
        async (nextSession: Partial<UserSession>) => {
            const normalized = writeStoredUserSession({ ...session, ...nextSession });
            setSession(normalized);
            await queryClient.invalidateQueries();
            return normalized;
        },
        [queryClient, session],
    );

    const resetSession = useCallback(async () => {
        const normalized = writeStoredUserSession(DEFAULT_USER_SESSION);
        setSession(normalized);
        await queryClient.invalidateQueries();
        return normalized;
    }, [queryClient]);

    const value = useMemo(
        () => ({ session, updateSession, resetSession }),
        [resetSession, session, updateSession],
    );

    return (
        <UserSessionContext.Provider value={value}>
            {children}
        </UserSessionContext.Provider>
    );
}
