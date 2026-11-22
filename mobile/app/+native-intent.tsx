/**
 * NutriLens — Native Intent Interceptor
 *
 * Prevents Expo Router from treating external OAuth callback deep links
 * (e.g. nutrilens:///oauthredirect) as screen navigation targets,
 * allowing expo-auth-session to process the callback without displaying
 * an "Unmatched Route" error screen.
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  if (path && path.includes('oauthredirect')) {
    // Intercept OAuth callback so Expo Router does not attempt to render an unmatched route
    return '';
  }
  return path;
}
