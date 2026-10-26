import { Context, Next } from 'hono';
import { AppContext } from '../../core/types';
import { getSsoAuthorizeUrl } from './edge-auth-guard';

export async function requireAuth(c: Context<AppContext>, next: Next) {
  const session = c.get('session');
  if (!session) {
    if (c.req.header('HX-Request')) {
      return c.text('无权访问', 403);
    }
    return c.redirect('/');
  }
  await next();
}
