import { Context, Next } from 'hono';
import { AppContext } from '../../core/types';

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
