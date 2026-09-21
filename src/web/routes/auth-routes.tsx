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
  const { authUseCase } = c.get('services');
  const body = await c.req.parseBody<{ username?: string; password?: string }>();
  const username = body.username || '';
  const password = body.password || '';

  const result = await authUseCase.login(username, password);
  if (!result.success) {
    return c.html(<AuthPage mode="login" error={result.error.message} />, 400);
  }

  const isProd = c.req.url.startsWith('https://');
  setCookie(c, 'mylog_session', result.data.sessionToken, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.redirect('/');
});

authRoutes.get('/register', (c) => {
  const session = c.get('session');
  if (session) return c.redirect('/');
  return c.html(<AuthPage mode="register" />);
});

authRoutes.post('/register', async (c) => {
  const { authUseCase } = c.get('services');
  const body = await c.req.parseBody<{ username?: string; password?: string }>();
  const username = body.username || '';
  const password = body.password || '';

  const result = await authUseCase.register(username, password);
  if (!result.success) {
    return c.html(<AuthPage mode="register" error={result.error.message} />, 400);
  }

  const isProd = c.req.url.startsWith('https://');
  setCookie(c, 'mylog_session', result.data.sessionToken, {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.redirect('/');
});

authRoutes.get('/logout', async (c) => {
  const { authUseCase } = c.get('services');
  const sessionToken = getCookie(c, 'mylog_session');
  if (sessionToken) {
    await authUseCase.logout(sessionToken);
    deleteCookie(c, 'mylog_session', { path: '/' });
  }
  return c.redirect('/login');
});
