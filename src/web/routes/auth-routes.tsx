import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { AuthPage } from '../views/auth-views';
import { AppContext } from '../../core/types';

export const authRoutes = new Hono<AppContext>();

authRoutes.get('/login', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/');
  return c.html(<AuthPage mode="login" />);
});

authRoutes.post('/login', async (c) => {
  const { authService } = c.get('services');
  const body = await c.req.parseBody<{ username?: string; password?: string }>();
  const username = body.username || '';
  const password = body.password || '';

  try {
    const { sessionToken } = await authService.login(username, password);

    const isProd = c.req.url.startsWith('https://');
    setCookie(c, 'mylog_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.redirect('/');
  } catch (err: any) {
    return c.html(<AuthPage mode="login" error={err.message || '登录失败'} />, 400);
  }
});

authRoutes.get('/register', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/');
  return c.html(<AuthPage mode="register" />);
});

authRoutes.post('/register', async (c) => {
  const { authService } = c.get('services');
  const body = await c.req.parseBody<{ username?: string; password?: string }>();
  const username = body.username || '';
  const password = body.password || '';

  try {
    const { sessionToken } = await authService.register(username, password);

    const isProd = c.req.url.startsWith('https://');
    setCookie(c, 'mylog_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.redirect('/');
  } catch (err: any) {
    return c.html(<AuthPage mode="register" error={err.message || '注册失败'} />, 400);
  }
});

authRoutes.get('/logout', async (c) => {
  const { authService } = c.get('services');
  const sessionToken = getCookie(c, 'mylog_session');
  if (sessionToken) {
    await authService.logout(sessionToken);
    deleteCookie(c, 'mylog_session', { path: '/' });
  }
  return c.redirect('/login');
});
