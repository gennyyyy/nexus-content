import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

import { AppWithRouter } from "../App";
import { UserSessionProvider } from "../components/UserSessionProvider";

export function renderApp(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserSessionProvider>
        <AppWithRouter useMemoryRouter initialEntries={initialEntries} />
      </UserSessionProvider>
    </QueryClientProvider>,
  );
}
