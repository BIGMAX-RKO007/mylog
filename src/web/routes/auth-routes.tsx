import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { AppContext } from '../../core/types';
import { exchangeSsoTicket, getSsoAuthorizeUrl } from '../middleware/edge-auth-guard';

export const authRoutes = new Hono<AppContext>();

// 1. 登录入口：引导至 myauth 统一授权中心
authRoutes.get('/login', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/');

  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const appId = c.env.MYAUTH_APP_ID || 'app_mylog';
  const redirectUri = c.req.query('redirect') || 'https://blog.bigmax.dpdns.org/';
  const ssoUrl = getSsoAuthorizeUrl(authHubUrl, appId, redirectUri);
  return c.redirect(ssoUrl);
});

// 2. 统一 SSO 回调处理 (供子应用显式跳转或探针回调)
authRoutes.get('/auth/callback', async (c) => {
  const ticket = c.req.query('ticket');
  if (!ticket) {
    return c.redirect('/');
  }

  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const appId = c.env.MYAUTH_APP_ID || 'app_mylog';
  const clientSecret = c.env.MYAUTH_CLIENT_SECRET || 'sec_ee78fe3728e742a4a40d825f';
  const { authService } = c.get('services');

  const exchange = await exchangeSsoTicket(authHubUrl, appId, clientSecret, ticket);
  if (exchange.success && exchange.user) {
    const { sessionToken, session } = await authService.syncSsoUser(exchange.user);

    const isProd = c.req.url.startsWith('https://');
    setCookie(c, 'mylog_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    c.set('session', session);
  }

  return c.redirect('/');
});

// 3. 注册入口：引导至 myauth 统一注册中心
authRoutes.get('/register', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/');

  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const redirectUri = encodeURIComponent('https://blog.bigmax.dpdns.org/');
  return c.redirect(`${authHubUrl}/register?redirect=${redirectUri}`);
});

// 4. 退出登录：清除本地 Session 并联动登出 myauth 统一中心
authRoutes.get('/logout', async (c) => {
  const { authService } = c.get('services');
  const sessionToken = getCookie(c, 'mylog_session');
  if (sessionToken) {
    await authService.logout(sessionToken);
    deleteCookie(c, 'mylog_session', { path: '/' });
  }

  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const returnUrl = encodeURIComponent('https://blog.bigmax.dpdns.org/');
  return c.redirect(`${authHubUrl}/logout?redirect=${returnUrl}`);
});
