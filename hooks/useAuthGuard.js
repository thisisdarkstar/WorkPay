import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getActiveSession } from '../services/ApiService';

/**
 * Client-side route guard.
 *
 * NOTE: This is a UX/defense-in-depth guard only. The backend remains the
 * authoritative authorization boundary and must independently reject any
 * cross-role or unauthorized API request. This hook simply prevents an
 * unauthenticated or wrong-role user from viewing a protected screen shell.
 *
 * @param {'admin' | 'employee'} expectedRole - role required for this stack
 * @returns {{ checking: boolean, authorized: boolean }}
 */
export function useAuthGuard(expectedRole) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const session = await getActiveSession();
        if (!isMounted) return;

        if (!session || !session.token) {
          setAuthorized(false);
          router.replace('/');
          return;
        }

        if (expectedRole && session.role !== expectedRole) {
          // Send the user to their own stack rather than an unauthorized shell.
          setAuthorized(false);
          if (session.role === 'admin') {
            router.replace('/(admin)/(dashboard)/Dashboard');
          } else {
            router.replace('/(employee)/(home)/Home');
          }
          return;
        }

        setAuthorized(true);
      } catch {
        if (isMounted) {
          setAuthorized(false);
          router.replace('/');
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [expectedRole]);

  return { checking, authorized };
}

export default useAuthGuard;
