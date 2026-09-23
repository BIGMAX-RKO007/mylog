import { FC } from 'hono/jsx';
import { Layout } from './layout';
import { FileGrid } from './components/FileGrid';
import { FileViewer } from './components/FileViewer';
import { DocumentMetadata, ParsedDocument } from '../../services/document-service';
import { UserSession } from '../../core/types';

interface DrivePageProps {
  files: DocumentMetadata[];
  selectedSort?: 'latest' | 'views';
  searchQuery?: string;
  popularTags?: { name: string; count: number }[];
  selectedTag?: string;
  expandedKeywords?: string[];
  selectedFile?: {
    metadata: DocumentMetadata;
    parsed: ParsedDocument;
    isOwner: boolean;
  };
  session?: UserSession;
}

export const DriveView: FC<DrivePageProps> = ({
  files,
  selectedSort = 'latest',
  searchQuery = '',
  popularTags = [],
  selectedTag = '',
  expandedKeywords = [],
  selectedFile,
  session,
}) => {

  // 1. 单篇文档深度沉浸式阅读模式 (Reader Mode)
  if (selectedFile) {
    return (
      <div class="bento-app-container">
        {/* 顶部悬浮导航 */}
        <header class="bento-header">
          <div class="header-inner">
            <div class="header-left">
              <a href="/" class="brand-link">
                <svg class="brand-flame-svg" viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="flameGradReader" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#ea580c" />
                      <stop offset="55%" stop-color="#f97316" />
                      <stop offset="100%" stop-color="#0ea5e9" />
                    </linearGradient>
                    <linearGradient id="flameInnerReader" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stop-color="#f97316" />
                      <stop offset="100%" stop-color="#fef08a" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                    fill="url(#flameInnerReader)"
                    opacity="0.95"
                  />
                  <path
                    d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                    stroke="url(#flameGradReader)"
                    stroke-width="2"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="brand-name">mylog</span>
              </a>

              <a href="/" class="reader-back-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>返回知识库</span>
              </a>
            </div>

            <div class="header-right">
              {session ? (
                <div class="user-top-profile">
                  <div class="avatar-ring">{session.username.slice(0, 1).toUpperCase()}</div>
                  <span class="avatar-name">{session.username}</span>
                  <a href="/logout" class="quick-logout-btn" title="退出登录">退出</a>
                </div>
              ) : (
                <a href="/login" class="nav-login-pill">登录 / 注册</a>
              )}
            </div>
          </div>
        </header>

        {/* 沉浸式阅读主体 */}
        <main class="reader-stage-center">
          <FileViewer
            metadata={selectedFile.metadata}
            parsed={selectedFile.parsed}
            isOwner={selectedFile.isOwner}
          />
        </main>
      </div>
    );
  }


  return (
    <div id="drive-main-container" class="bento-app-container">
      {/* 1. 悬浮毛玻璃顶部导航条 (Floating Frosted Top Navbar) */}
      <header class="bento-header">
        <div class="header-inner">
          {/* 左侧：Logo 标识与品牌 */}
          <div class="header-left">
            <a href="/" class="brand-link">
              <svg class="brand-flame-svg" viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="flameGradBento" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#ea580c" />
                    <stop offset="55%" stop-color="#f97316" />
                    <stop offset="100%" stop-color="#0ea5e9" />
                  </linearGradient>
                  <linearGradient id="flameInnerBento" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#f97316" />
                    <stop offset="100%" stop-color="#fef08a" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                  fill="url(#flameInnerBento)"
                  opacity="0.95"
                />
                <path
                  d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                  stroke="url(#flameGradBento)"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="brand-name">mylog</span>
              <span class="bento-badge">Bento</span>
            </a>
          </div>

          {/* 中部：醒目大气的毛玻璃居中全宽搜索框 (Frosted Glass Search Bar) */}
          <div class="header-center">
            <div class="bento-search-box">
              <svg class="search-lens-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="file-search-input"
                type="search"
                name="q"
                class="bento-search-input"
                placeholder="搜索文档标题、内容或标签..."
                value={searchQuery}
                hx-get="/files"
                hx-trigger="keyup changed delay:250ms, search"
                hx-target="#file-grid-container"
                hx-include="#current-sort-id, #current-tag-id"
                hx-swap="innerHTML"
              />

              <span class="search-kbd-pill">⌘K</span>
            </div>
          </div>

          {/* 右上角：明确放置用户登录/头像入口 (Explicit Top-Right User Menu) */}
          <div class="header-right">
            {/* 明暗主题切换 */}
            <button
              class="theme-circle-btn"
              title="切换主题"
              onclick="
                const cur = document.documentElement.getAttribute('data-theme');
                const next = cur === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('mylog_theme', next);
              "
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>

            {session ? (
              <div class="user-top-profile">
                {session.roles?.includes('rol_accountadmin') && (
                  <a href="/admin/rbac" class="admin-badge-pill" title="访问 Snowflake RBAC 权限管理中心">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>权限中心</span>
                  </a>
                )}
                <div class="avatar-ring" title={`当前登录: ${session.username}`}>
                  {session.username.slice(0, 1).toUpperCase()}
                </div>
                <a href="/logout" class="quick-logout-btn" title="安全退出">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                </a>
              </div>
            ) : (
              <a href="/login" class="nav-login-pill">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                </svg>
                <span>登录 / 注册</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 隐藏状态字段供检索与排序联动 */}
      <input type="hidden" id="current-sort-id" name="sort" value={selectedSort} />
      <input type="hidden" id="current-tag-id" name="tag" value={selectedTag} />

      {/* 2. 主体舞台 (Main Bento Stage) */}
      <main class="bento-main-stage">
        {/* 分类筛选与排序控制中枢 */}
        <section class="bento-control-hub">
          {/* AI 意图理解联想词浮现提示条 */}
          {expandedKeywords && expandedKeywords.length > 0 && (
            <div class="ai-expansion-banner">
              <span class="banner-sparkle">💡</span>
              <span class="banner-title">智能管理员联想关联领域：</span>
              <div class="banner-keyword-pills">
                {expandedKeywords.map((kw) => (
                  <span key={kw} class="expanded-kw-pill">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 热门智能标签横向胶囊墙 (知识库主维度) */}
          {popularTags && popularTags.length > 0 && (
            <div class="tags-ribbon-container">
              <span class="tags-ribbon-hint">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span>标签集：</span>
              </span>

              {selectedTag && (
                <a
                  href={`/?sort=${selectedSort}`}
                  class="tag-pill-chip active-tag-pill"
                  title="点击取消此标签筛选"
                  hx-get={`/?sort=${selectedSort}`}
                  hx-target="#drive-main-container"
                  hx-swap="outerHTML"
                  hx-push-url="true"
                >
                  <span>#{selectedTag}</span>
                  <span class="tag-close-x">✕</span>
                </a>
              )}

              {popularTags
                .filter((pt) => pt.name !== selectedTag)
                .slice(0, 15)
                .map((pt) => (
                  <a
                    key={pt.name}
                    href={`/?tag=${encodeURIComponent(pt.name)}&sort=${selectedSort}`}
                    class="tag-pill-chip"
                    hx-get={`/?tag=${encodeURIComponent(pt.name)}&sort=${selectedSort}`}
                    hx-target="#drive-main-container"
                    hx-swap="outerHTML"
                    hx-push-url="true"
                  >
                    <span>#{pt.name}</span>
                    <span class="tag-count">{pt.count}</span>
                  </a>
                ))}
            </div>
          )}

          {/* 状态统计与排序控制器 */}
          <div class="bento-filter-row">
            <div class="filter-row-left">
              <span class="stage-tag">{selectedTag ? `#${selectedTag}` : '全部知识库'}</span>
              <span class="doc-counter">共 <strong>{files.length}</strong> 篇文档</span>
            </div>

            <div class="filter-row-right">
              <div class="bento-sort-toggle">
                <button
                  type="button"
                  id="sort-btn-views"
                  class={`sort-pill ${selectedSort === 'views' ? 'active' : ''}`}
                  onclick="
                    document.getElementById('current-sort-id').value = 'views';
                    document.getElementById('sort-btn-views').classList.add('active');
                    document.getElementById('sort-btn-latest').classList.remove('active');
                  "
                  hx-get="/files?sort=views"
                  hx-include="#current-tag-id, #file-search-input"
                  hx-target="#file-grid-container"
                  hx-swap="innerHTML"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="#f97316">
                    <path d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z" fill="#f97316"/>
                    <path d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z" stroke="#ea580c" stroke-width="1.8"/>
                  </svg>
                  <span>点击榜</span>
                </button>

                <button
                  type="button"
                  id="sort-btn-latest"
                  class={`sort-pill ${selectedSort !== 'views' ? 'active' : ''}`}
                  onclick="
                    document.getElementById('current-sort-id').value = 'latest';
                    document.getElementById('sort-btn-latest').classList.add('active');
                    document.getElementById('sort-btn-views').classList.remove('active');
                  "
                  hx-get="/files?sort=latest"
                  hx-include="#current-tag-id, #file-search-input"
                  hx-target="#file-grid-container"
                  hx-swap="innerHTML"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>最新</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 便当盒非对称卡片展示区 (Bento Box Grid) */}
        <section id="file-grid-container" class="bento-viewport">
          <FileGrid files={files} session={session} />
        </section>
      </main>

      {/* 4. 右下角呼吸高能光晕悬浮按钮 (Floating Action Button - FAB) */}
      <button
        class="fab-upload"
        title="上传新的 Markdown 文档"
        hx-get="/files/upload-modal"
        hx-target="#modal-container"
        hx-swap="innerHTML"
      >
        <span class="fab-glow-aura"></span>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span class="fab-label">上传 Markdown</span>
      </button>
    </div>
  );
};

export const DrivePage: FC<DrivePageProps> = (props) => {
  return (
    <Layout title="mylog — Bento 智能知识库" session={props.session}>
      <DriveView {...props} />
    </Layout>
  );
};
