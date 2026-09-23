import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSsoAuthorizeUrl,
  exchangeSsoTicket,
  verifyMyauthSession,
  requireAuthGuard,
  ssoSessionMiddleware,
} from '../src/web/middleware/edge-auth-guard';

describe('myauth SSO Edge Auth Guard Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSsoAuthorizeUrl 应生成符合 myauth 标准协议的授权重定向地址', () => {
    const hubUrl = 'https://bigmax.dpdns.org';
    const appId = 'app_mylog';
    const currentUrl = 'https://blog.bigmax.dpdns.org/admin/rbac?sort=latest';

    const redirectUrl = getSsoAuthorizeUrl(hubUrl, appId, currentUrl);
    const parsed = new URL(redirectUrl);

    expect(parsed.origin).toBe('https://bigmax.dpdns.org');
    expect(parsed.pathname).toBe('/sso/authorize');
    expect(parsed.searchParams.get('app_id')).toBe('app_mylog');
    expect(parsed.searchParams.get('redirect_uri')).toBe(currentUrl);
  });

  it('exchangeSsoTicket 应向 myauth/sso/exchange 发送正确的 JSON 凭据', async () => {
    const mockUser = {
      id: 'usr_123',
      username: 'fanxiao',
      email: 'fanxiao@example.com',
      roles: ['rol_accountadmin'],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        accessToken: 'jwt_mock_token',
        user: mockUser,
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await exchangeSsoTicket(
      'https://bigmax.dpdns.org',
      'app_mylog',
      'sec_ee78fe3728e742a4a40d825f',
      'ticket_xyz'
    );

    expect(mockFetch).toHaveBeenCalledWith('https://bigmax.dpdns.org/sso/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: 'app_mylog',
        clientSecret: 'sec_ee78fe3728e742a4a40d825f',
        ticket: 'ticket_xyz',
      }),
    });

    expect(res.success).toBe(true);
    expect(res.user?.username).toBe('fanxiao');
    expect(res.user?.roles).toContain('rol_accountadmin');
  });

  it('verifyMyauthSession 在 Token 有效时正确解析用户实体', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        user: { id: 'usr_admin', username: 'admin', roles: ['rol_admin'] },
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await verifyMyauthSession('https://bigmax.dpdns.org', 'token_valid');
    expect(res.valid).toBe(true);
    expect(res.user?.username).toBe('admin');
  });

  it('requireAuthGuard 未登录普通请求返回 302 重定向到 SSO', async () => {
    const next = vi.fn();
    const mockRedirect = vi.fn().mockReturnValue('REDIRECTED');

    const ctx: any = {
      get: vi.fn().mockReturnValue(undefined),
      req: {
        url: 'https://blog.bigmax.dpdns.org/admin/rbac',
        header: vi.fn().mockReturnValue(null),
      },
      env: {
        AUTH_HUB_URL: 'https://bigmax.dpdns.org',
        MYAUTH_APP_ID: 'app_mylog',
      },
      redirect: mockRedirect,
    };

    const res = await requireAuthGuard(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      'https://bigmax.dpdns.org/sso/authorize?app_id=app_mylog&redirect_uri=https%3A%2F%2Fblog.bigmax.dpdns.org%2Fadmin%2Frbac'
    );
    expect(res).toBe('REDIRECTED');
  });

  it('requireAuthGuard 对 HTMX 请求响应 401 并设置 HX-Redirect 头部', async () => {
    const next = vi.fn();
    const setHeader = vi.fn();
    const mockText = vi.fn().mockReturnValue('HTMX_401');

    const ctx: any = {
      get: vi.fn().mockReturnValue(undefined),
      req: {
        url: 'https://blog.bigmax.dpdns.org/admin/rbac',
        header: vi.fn((name) => (name === 'HX-Request' ? 'true' : null)),
      },
      env: {
        AUTH_HUB_URL: 'https://bigmax.dpdns.org',
        MYAUTH_APP_ID: 'app_mylog',
      },
      header: setHeader,
      text: mockText,
    };

    const res = await requireAuthGuard(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith(
      'HX-Redirect',
      'https://bigmax.dpdns.org/sso/authorize?app_id=app_mylog&redirect_uri=https%3A%2F%2Fblog.bigmax.dpdns.org%2Fadmin%2Frbac'
    );
    expect(mockText).toHaveBeenCalledWith('', 401);
    expect(res).toBe('HTMX_401');
  });

  it('requireAuthGuard 已有有效 Session 时直接放行', async () => {
    const next = vi.fn().mockResolvedValue('NEXT_CALLED');

    const ctx: any = {
      get: vi.fn((key) => {
        if (key === 'session') return { userId: 'usr_1', username: 'alice', roles: ['rol_user'] };
        return null;
      }),
      req: { url: 'https://blog.bigmax.dpdns.org/admin/rbac' },
      env: {},
    };

    await requireAuthGuard(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
