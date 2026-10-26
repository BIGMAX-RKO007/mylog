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
            </div>

            <div class="header-right">
              {session ? (
                <div class="user-top-profile">
                  <span class="master-status-pill" title="已解锁个人私有网盘">⚡ Master</span>
                  <a href="/logout" class="quick-logout-btn" title="锁定并退出 (返回伪装状态)">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>锁定</span>
                  </a>
                </div>
              ) : null}
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
          {/* 左侧：Logo 标识与品牌 (双击可激活 Master 极客暗门) */}
          <div class="header-left">
            <a
              href="/"
              class="brand-link"
              title="mylog — 双击唤出 Master 密钥暗门"
              ondblclick="event.preventDefault(); window.toggleMasterUnlockModal && window.toggleMasterUnlockModal(true);"
            >
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

          {/* 中部：仅在 Master 解锁网盘后展示搜索框 */}
          {session ? (
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
                  placeholder="搜索网盘文件、标题、标签，或输入 :lock 锁定..."
                  value={searchQuery}
                  hx-get="/files"
                  hx-trigger="keyup changed delay:250ms, search, keydown[key=='Enter']"
                  hx-target="#file-grid-container"
                  hx-include="#current-sort-id, #current-tag-id"
                  hx-swap="innerHTML"
                />
                <span class="search-kbd-pill" title="按回车即刻检索">Enter</span>
              </div>
            </div>
          ) : (
            <div class="header-center"></div>
          )}

          {/* 右上角：纯粹伪装模式 (未登录时不放任何登录/注册入口，仅暗门解锁后才显示 Master 状态) */}
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

            {session && (
              <div class="user-top-profile">
                <span class="master-status-pill" title="已解锁个人私有网盘">⚡ Master</span>
                <a href="/logout" class="quick-logout-btn" title="锁定并退出 (返回只读伪装)">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>锁定</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 隐藏状态字段供检索与排序联动 */}
      <input type="hidden" id="current-sort-id" name="sort" value={selectedSort} />
      <input type="hidden" id="current-tag-id" name="tag" value={selectedTag} />

      {/* 2. 主体舞台 (Main Bento Stage) */}
      <main class="bento-main-stage">
        {!session ? (
          /* 普通访客访问：什么都不显示，极致简约纯净伪装 */
          <div
            class="stealth-empty-hero"
            ondblclick="window.toggleMasterUnlockModal && window.toggleMasterUnlockModal(true)"
            title="双击唤出 Master 密钥暗门"
          >
            <div class="stealth-ambient-glow"></div>
            <div class="stealth-center-box">
              <svg class="stealth-logo-svg" viewBox="0 0 24 24" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="stealthGradHero" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#ea580c" />
                    <stop offset="55%" stop-color="#f97316" />
                    <stop offset="100%" stop-color="#0ea5e9" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                  fill="#f97316"
                  opacity="0.85"
                />
                <path
                  d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                  stroke="url(#stealthGradHero)"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
              <h1 class="stealth-title">mylog</h1>
              <p class="stealth-desc">个人专属私有空间 · 暂未发布公开内容</p>
            </div>
          </div>
        ) : (
          <>
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

            {/* 便当盒非对称卡片展示区 (Bento Box Grid) */}
            <section id="file-grid-container" class="bento-viewport">
              <FileGrid files={files} session={session} />
            </section>
          </>
        )}
      </main>

      {/* 4. 伪装极简页脚 */}
      <footer class="bento-footer">
        <p>
          <span>© {new Date().getFullYear()} mylog · 边缘云存储与 Bento 知识网盘</span>
          {!session && (
            <button
              type="button"
              class="footer-stealth-dot"
              onclick="window.toggleMasterUnlockModal && window.toggleMasterUnlockModal(true)"
              title="Master 密钥解锁"
            >
              ·
            </button>
          )}
        </p>
      </footer>

      {/* 5. 隐蔽 Master 密钥解锁模态框 */}
      {!session && (
        <div
          id="master-unlock-modal"
          class="stealth-modal-backdrop"
          style="display: none;"
          onclick="if(event.target === this) window.toggleMasterUnlockModal(false);"
        >
          <div class="stealth-modal-sheet">
            <div class="stealth-sheet-header">
              <div class="stealth-lock-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="stealth-sheet-titles">
                <h3 class="stealth-sheet-title">🔐 Master 密钥解锁</h3>
                <p class="stealth-sheet-desc">输入专属密钥即可进入个人私有网盘模式，开启自由上传与下载</p>
              </div>
              <button
                type="button"
                class="stealth-close-btn"
                onclick="window.toggleMasterUnlockModal(false)"
                title="关闭"
              >
                ✕
              </button>
            </div>

            <form
              id="stealth-unlock-form"
              method="post"
              action="/api/unlock"
              hx-post="/api/unlock"
              hx-target="#unlock-feedback"
              hx-swap="innerHTML"
              class="stealth-sheet-form"
            >
              <div class="stealth-input-group">
                <input
                  id="master-key-input"
                  name="key"
                  type="password"
                  class="stealth-password-input"
                  placeholder="请输入 MASTER_KEY 密钥..."
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="stealth-eye-btn"
                  onclick="
                    const inp = document.getElementById('master-key-input');
                    inp.type = inp.type === 'password' ? 'text' : 'password';
                  "
                  title="查看密钥明文"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>

              <div id="unlock-feedback"></div>

              <div class="stealth-sheet-actions">
                <button
                  type="button"
                  class="stealth-btn-cancel"
                  onclick="window.toggleMasterUnlockModal(false)"
                >
                  取消
                </button>
                <button type="submit" class="stealth-btn-submit">
                  <span>解锁进入网盘</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>

              <div class="stealth-sheet-tip">
                <span>💡 快捷提示：双击左上角 Logo 或按 <code>Ctrl+Shift+L</code> 亦可呼出</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. 仅在 Master 解锁网盘时显示上传悬浮按钮 (未登录时完全不渲染，实现绝对伪装) */}
      {session && (
        <button
          class="fab-upload"
          title="上传文件至个人网盘 (支持 PPT/PPTX、Office、PDF、代码及各类二进制文件)"
          hx-get="/files/upload-modal"
          hx-target="#modal-container"
          hx-swap="innerHTML"
        >
          <span class="fab-glow-aura"></span>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span class="fab-label">上传至网盘</span>
        </button>
      )}

      {/* 7. 暗门激活与全局快捷键脚本 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.toggleMasterUnlockModal = function(show) {
            const modal = document.getElementById('master-unlock-modal');
            if (!modal) return;
            const curOpen = modal.style.display !== 'none';
            const targetOpen = typeof show === 'boolean' ? show : !curOpen;
            modal.style.display = targetOpen ? 'flex' : 'none';
            if (targetOpen) {
              setTimeout(() => {
                const inp = document.getElementById('master-key-input');
                if (inp) inp.focus();
              }, 60);
            }
          };

          // 全局快捷键 Ctrl+Shift+L 呼出暗门
          document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
              e.preventDefault();
              window.toggleMasterUnlockModal();
            }
            if (e.key === 'Escape') {
              window.toggleMasterUnlockModal(false);
            }
          });

          // 搜索框输入暗门指令按回车激活
          const searchInp = document.getElementById('file-search-input');
          if (searchInp) {
            searchInp.addEventListener('keydown', function(e) {
              if (e.key === 'Enter') {
                const val = (searchInp.value || '').trim();
                if (['login', 'unlock', 'master', ':key', 'mylog-master-key'].includes(val) || val.startsWith(':key ')) {
                  e.preventDefault();
                  window.toggleMasterUnlockModal(true);
                  if (val === 'mylog-master-key') {
                    const kInp = document.getElementById('master-key-input');
                    if (kInp) kInp.value = val;
                  }
                }
              }
            });
          }

          // 若 URL 包含 unlock 或 login 参数，自动激活暗门
          if (window.location.search.includes('unlock') || window.location.search.includes('login')) {
            window.toggleMasterUnlockModal(true);
          }
        `
      }} />
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
