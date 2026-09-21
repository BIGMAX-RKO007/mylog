import { FC, PropsWithChildren } from 'hono/jsx';
import { UserSession } from '../../core/types';

interface LayoutProps {
  title?: string;
  session?: UserSession;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({ title = 'mylog — Markdown 专属智能知识库', session, children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        {/* Google Fonts: Inter 现代经典无衬线字体 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/styles/main.css?v=3.0" />
        {/* HTMX 官方轻量脚本 (仅 14KB，零构建负担) */}
        <script src="https://unpkg.com/htmx.org@2.0.3"></script>
        {/* 内联防闪烁主题脚本 */}
        <script dangerouslySetInnerHTML={{
          __html: `
            const theme = localStorage.getItem('mylog_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
            document.documentElement.setAttribute('data-theme', theme);
          `
        }} />
      </head>
      <body class="app-body">
        {children}

        {/* 全局模态框挂载容器 (由 HTMX 动态注入内容) */}
        <div id="modal-container"></div>
      </body>
    </html>
  );
};
