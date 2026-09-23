import { Context, Next } from 'hono';
import { AppContext } from '../../core/types';
import { getSsoAuthorizeUrl } from './edge-auth-guard';

export async function requireAuth(c: Context<AppContext>, next: Next) {
  const session = c.get('session');
  if (!session) {
    const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
    const appId = c.env.MYAUTH_APP_ID || 'app_mylog';
    const redirectUrl = getSsoAuthorizeUrl(authHubUrl, appId, c.req.url);

    if (c.req.header('HX-Request')) {
      c.header('HX-Redirect', redirectUrl);
      return c.text('', 401);
    }
    return c.redirect(redirectUrl);
  }
  await next();
}
