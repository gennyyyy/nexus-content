import { createContext, useContext } from "react";

import type { UserSession } from "../lib/user-session";

export interface UserSessionContextValue {
    session: UserSession;
    updateSession: (nextSession: Partial<UserSession>) => Promise<UserSession>;
    resetSession: () => Promise<UserSession>;
}

export const UserSessionContext = createContext<
    UserSessionContextValue | undefined
>(undefined);

export function useUserSession() {
    const context = useContext(UserSessionContext);
    if (!context) {
        throw new Error("useUserSession must be used inside <UserSessionProvider>");
    }
    return context;
}
