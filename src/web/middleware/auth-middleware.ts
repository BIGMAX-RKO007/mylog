import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { AuthService } from '../../services/auth-service';
import { AppContext } from '../../core/types';

export function createAuthMiddleware(authService: AuthService) {
  return async (c: Context<AppContext>, next: Next) => {
    const sessionToken = getCookie(c, 'mylog_session');
    if (sessionToken) {
      const session = await authService.validateSession(sessionToken);
      if (session) {
        c.set('session', session);
      }
    }
    await next();
  };
}

export async function requireAuth(c: Context<AppContext>, next: Next) {
  const session = c.get('session');
  if (!session) {
    if (c.req.header('HX-Request')) {
      c.header('HX-Redirect', '/login');
      return c.text('', 401);
    }
    return c.redirect('/login');
  }
  await next();
}
