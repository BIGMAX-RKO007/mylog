import { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { AppContext, UserSession } from '../../core/types';

export interface SsoUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  roles: string[];
}

export interface SsoExchangeResponse {
  success: boolean;
  accessToken?: string;
  user?: SsoUser;
  error?: string;
}

/**
 * 向 myauth 统一认证中心发起 Ticket 换票
 */
export async function exchangeSsoTicket(
  authHubUrl: string,
  appId: string,
  clientSecret: string,
  ticket: string
): Promise<SsoExchangeResponse> {
  try {
    const resp = await fetch(`${authHubUrl}/sso/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, clientSecret, ticket }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return { success: false, error: `Exchange failed (${resp.status}): ${errText}` };
    }
    return (await resp.json()) as SsoExchangeResponse;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during SSO exchange' };
  }
}

/**
 * 向 myauth 验证现有会话 Token (如通过 .dpdns.org 共享的 myauth_session Cookie)
 */
export async function verifyMyauthSession(
  authHubUrl: string,
  token: string
): Promise<{ valid: boolean; user?: SsoUser }> {
  try {
    const resp = await fetch(`${authHubUrl}/api/verify?token=${encodeURIComponent(token)}`);
    if (!resp.ok) return { valid: false };
    const data = (await resp.json()) as any;
    if (data.valid && data.user) {
      return { valid: true, user: data.user };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * 构造统一认证跳转 URL
 */
export function getSsoAuthorizeUrl(
  authHubUrl: string,
  appId: string,
  currentUrl: string
): string {
  return `${authHubUrl}/sso/authorize?app_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(currentUrl)}`;
}

/**
 * 全局 SSO 票据拦截与会话自动打通中间件
 * 1. 拦截 URL 携带的 ?ticket=xxx 参数，自动置换为本地会话
 * 2. 检查本地 mylog_session，若无则探查上游 myauth_session
 */
export async function ssoSessionMiddleware(c: Context<AppContext>, next: Next) {
  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const appId = c.env.MYAUTH_APP_ID || 'app_mylog';
  const clientSecret = c.env.MYAUTH_CLIENT_SECRET || 'sec_ee78fe3728e742a4a40d825f';
  const { authService } = c.get('services');

  // 1. 处理 SSO 回调携带的 ticket
  const ticket = c.req.query('ticket');
  if (ticket) {
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

      // 移除 URL 上的 ticket 与 state 参数，跳转回纯净的目标 URL
      const cleanUrl = new URL(c.req.url);
      cleanUrl.searchParams.delete('ticket');
      cleanUrl.searchParams.delete('state');
      return c.redirect(cleanUrl.toString());
    } else {
      console.error('[SSO] Ticket exchange failed:', exchange.error);
    }
  }

  // 2. 验证本地已有会话
  const localToken = getCookie(c, 'mylog_session');
  if (localToken) {
    const session = await authService.validateSession(localToken);
    if (session) {
      c.set('session', session);
      await next();
      return;
    }
  }

  // 3. 本地无有效会话时，检查是否有同根域 myauth_session Cookie
  const hubToken = getCookie(c, 'myauth_session');
  if (hubToken) {
    const verifyRes = await verifyMyauthSession(authHubUrl, hubToken);
    if (verifyRes.valid && verifyRes.user) {
      const { sessionToken, session } = await authService.syncSsoUser(verifyRes.user);
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
  }

  await next();
}

/**
 * 保护路由守卫 (需要登录)
 * 未登录时引导用户跳转 myauth SSO 授权大厅
 */
export async function requireAuthGuard(c: Context<AppContext>, next: Next) {
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
