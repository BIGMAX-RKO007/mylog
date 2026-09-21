import { FC } from 'hono/jsx';
import { Layout } from './layout';

interface AuthPageProps {
  mode: 'login' | 'register';
  error?: string;
}

export const AuthPage: FC<AuthPageProps> = ({ mode, error }) => {
  const isLogin = mode === 'login';
  const title = isLogin ? '登录 mylog 知识库' : '注册 mylog 账号';
  const action = isLogin ? '/login' : '/register';

  return (
    <Layout title={title}>
      <div class="auth-page-stage">
        {/* 返回知识库快捷链接 */}
        <div class="auth-top-bar">
          <a href="/" class="reader-back-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>返回知识库大厅</span>
          </a>
        </div>

        {/* 居中毛玻璃 Bento Auth 卡片 */}
        <div class="auth-card-wrap">
          <div class="auth-bento-card">
            {/* 品牌火焰 Logo */}
            <div class="auth-brand-center">
              <a href="/" class="brand-link" style="justify-content: center;">
                <svg class="brand-flame-svg" viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="flameGradAuth" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#ea580c" />
                      <stop offset="55%" stop-color="#f97316" />
                      <stop offset="100%" stop-color="#0ea5e9" />
                    </linearGradient>
                    <linearGradient id="flameInnerAuth" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="#f97316" />
                      <stop offset="100%" stop-color="#fef08a" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                    fill="url(#flameInnerAuth)"
                    opacity="0.95"
                  />
                  <path
                    d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                    stroke="url(#flameGradAuth)"
                    stroke-width="2"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="brand-name">mylog</span>
              </a>
              <h1 class="auth-title">{isLogin ? '欢迎回到 mylog' : '开启专属知识库'}</h1>
              <p class="auth-subtitle">
                {isLogin ? '登录后即可行使所属角色的专属管理与编辑特权' : '内置 Snowflake 级 RBAC 细粒度对象隔离体系'}
              </p>
            </div>

            {/* 登录 / 注册分段切换器 */}
            <div class="auth-mode-segmented">
              <a href="/login" class={`auth-mode-tab ${isLogin ? 'active' : ''}`}>
                登录账号
              </a>
              <a href="/register" class={`auth-mode-tab ${!isLogin ? 'active' : ''}`}>
                注册新账号
              </a>
            </div>

            {/* 错误提示 */}
            {error && (
              <div class="auth-error-banner">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* 认证表单 */}
            <form action={action} method="post" class="auth-form">
              <div class="auth-form-group">
                <label class="auth-form-label">用户名</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    name="username"
                    required
                    autocomplete="username"
                    class="auth-input"
                    placeholder="请输入用户名 (例如: alex)"
                  />
                </div>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">登录密码</label>
                <div class="auth-input-wrapper">
                  <svg class="auth-input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    name="password"
                    required
                    autocomplete={isLogin ? 'current-password' : 'new-password'}
                    class="auth-input"
                    placeholder="请输入不少于 6 位的密码"
                  />
                </div>
              </div>

              <button type="submit" class="auth-submit-btn">
                <span>{isLogin ? '立即登录' : '创建并进入知识库'}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            {/* 底部跳转指引 */}
            <div class="auth-footer-hint">
              {isLogin ? (
                <span>
                  还没有账号？ <a href="/register" class="auth-hint-link">免费注册一个</a>
                </span>
              ) : (
                <span>
                  已有账号？ <a href="/login" class="auth-hint-link">直接点此登录</a>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
