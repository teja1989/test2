import { useQuery } from '@tanstack/react-query';

export interface AuthUser {
  sub: string;
  name: string;
  email: string;
  ssoEnabled: boolean;
}

async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me');
  if (res.status === 401) {
    const body = (await res.json().catch(() => ({}))) as { loginUrl?: string };
    // SSO is configured but no session — redirect to login
    if (body.loginUrl) {
      window.location.href = body.loginUrl;
    }
    return null;
  }
  if (!res.ok) return null;
  return res.json() as Promise<AuthUser>;
}

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: data !== null,
    isSsoEnabled: data?.ssoEnabled ?? false,
  };
}
