// @group Navigation > Ref : Global navigation ref for imperative auth redirects

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// @group Navigation > Ref : Force the app back to the Auth screen
// Used by the API 401 interceptor and the socket auth-error handler so an
// expired/revoked token always lands the user on the login screen instead of
// leaving them on a broken, data-less screen.
let redirecting = false;

export function forceAuthScreen(reason?: string): void {
  if (!navigationRef.isReady()) return;

  const current = navigationRef.getCurrentRoute()?.name;
  if (current === 'Auth') return;

  // Debounce: a single 401 can fan out into many failed requests at once.
  if (redirecting) return;
  redirecting = true;
  setTimeout(() => { redirecting = false; }, 1000);

  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Auth', params: reason ? { reason } : undefined }] })
  );
}
