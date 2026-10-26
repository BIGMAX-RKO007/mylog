import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { AppContext } from '../../core/types';
import { createMasterSessionToken } from '../middleware/edge-auth-guard';

export const authRoutes = new Hono<AppContext>();

/**
 * 1. 极客暗门解锁接口 (可通过搜索框指令或直接调用激活)
 */
authRoutes.post('/api/unlock', async (c) => {
  const body = await c.req.parseBody<{ key?: string }>();
  const key = (body.key || '').trim();
  const masterKey = c.env.MASTER_KEY || 'mylog-master-key';

  if (!key || key !== masterKey) {
    if (c.req.header('HX-Request')) {
      return c.html(
        `<div class="unlock-error-text" style="color: #ef4444; font-size: 0.85rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); margin-top: 0.5rem; text-align: center;">❌ 密钥不匹配，请核对后重试</div>`
      );
    }
    return c.redirect('/?unlock=1&error=1');
  }

  const token = await createMasterSessionToken(masterKey);
  const isProd = c.req.url.startsWith('https://');

  setCookie(c, 'mylog_master_session', token, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30, // 30 天有效
  });

  if (c.req.header('HX-Request')) {
    c.header('HX-Refresh', 'true');
    return c.text('Unlocked');
  }

  return c.redirect('/');
});

/**
 * 2. 锁定/退出个人网盘模式 (重回只读伪装)
 */
const handleLock = async (c: any) => {
  deleteCookie(c, 'mylog_master_session', { path: '/' });
  deleteCookie(c, 'mylog_session', { path: '/' });

  if (c.req.header('HX-Request')) {
    c.header('HX-Refresh', 'true');
    return c.text('Locked');
  }

  return c.redirect('/');
};

authRoutes.get('/logout', handleLock);
authRoutes.post('/api/lock', handleLock);

/**
 * 3. 访问 /login 或 /unlock 时，优雅导向主页并自动唤起暗门解锁弹窗
 */
authRoutes.get('/login', (c) => c.redirect('/?unlock=1'));
authRoutes.get('/unlock', (c) => c.redirect('/?unlock=1'));
authRoutes.get('/register', (c) => c.redirect('/'));
