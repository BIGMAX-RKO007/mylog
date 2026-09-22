// 自包含的 CSS 样式定义，确保在 Cloudflare Workers 边缘直接输出，无需额外静态资源服务器
export const MAIN_CSS = `
/* ==========================================================================
   Design System Tokens - Mobile-First & Bento Box Modern Palette
   ========================================================================== */
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /* 明亮通透背景与便当盒卡片 (Soft, Light Mode & Bento Surface) */
  --bg-stage: #f8fafc;
  --header-bg: rgba(255, 255, 255, 0.82);
  --header-border: rgba(226, 232, 240, 0.85);
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
  --card-border-hover: rgba(14, 165, 233, 0.4);
  
  --text-title: #0f172a;
  --text-body: #334155;
  --text-muted: #64748b;
  --text-dim: #94a3b8;

  /* 活力双核霓虹色彩 (Brand Warm Orange & Electric Sky Blue) */
  --warm-orange: #f97316;
  --warm-orange-glow: rgba(249, 115, 22, 0.45);
  --warm-orange-light: #fff7ed;
  
  --primary-blue: #0ea5e9;
  --primary-blue-hover: #0284c7;
  --primary-blue-glow: rgba(14, 165, 233, 0.35);
  --primary-blue-light: rgba(14, 165, 233, 0.08);

  --danger-color: #ef4444;
  --success-color: #10b981;

  /* 超圆滑平滑圆角 (Hyper-Smooth Rounded Radii) */
  --radius-bento: 24px;
  --radius-md: 14px;
  --radius-sm: 8px;
  --radius-pill: 9999px;

  /* 深度与弥散霓虹阴影 (Depth Shadows & Soft Glass Glow) */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-bento: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.02);
  --shadow-bento-hover: 0 16px 36px -6px rgba(15, 23, 42, 0.09), 0 6px 14px -3px rgba(14, 165, 233, 0.12);
  --shadow-fab: 0 12px 28px -4px rgba(249, 115, 22, 0.45), 0 6px 16px -2px rgba(2, 132, 199, 0.3);
  --shadow-glass: 0 10px 30px -5px rgba(0, 0, 0, 0.05);

  /* 兼容旧组件的变量映射 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --border-color: #e2e8f0;
  --border-subtle: #e2e8f0;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --accent-color: #0ea5e9;
  --primary-teal: #0ea5e9;
}

[data-theme="dark"] {
  --bg-stage: #090d16;
  --header-bg: rgba(15, 23, 42, 0.85);
  --header-border: rgba(30, 41, 59, 0.85);
  --card-bg: #111827;
  --card-border: #1f2937;
  --card-border-hover: rgba(56, 189, 248, 0.45);
  
  --text-title: #f8fafc;
  --text-body: #cbd5e1;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  --shadow-bento: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
  --shadow-bento-hover: 0 16px 36px -6px rgba(0, 0, 0, 0.6), 0 0 20px rgba(14, 165, 233, 0.2);

  --bg-primary: #090d16;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --border-color: #1f2937;
  --border-subtle: #1f2937;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body, .app-body {
  font-family: var(--font-sans);
  background-color: var(--bg-stage);
  color: var(--text-body);
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  position: relative;
  overflow-x: hidden;
}

/* ==========================================================================
   1. 悬浮毛玻璃顶部导航条 (Floating Frosted Top Navbar)
   ========================================================================== */
.bento-app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.bento-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  padding: 0.75rem 1.5rem;
  transition: all 0.2s ease;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

/* 左侧品牌与火焰矢量图标 */
.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
}

.brand-flame-svg {
  filter: drop-shadow(0 2px 8px rgba(249, 115, 22, 0.45));
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.brand-link:hover .brand-flame-svg {
  transform: rotate(-8deg) scale(1.1);
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text-title);
}

.bento-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(14, 165, 233, 0.15));
  color: var(--warm-orange);
  border: 1px solid rgba(249, 115, 22, 0.3);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

/* 中部：居中大号毛玻璃搜索框 */
.header-center {
  flex: 1;
  max-width: 620px;
  display: flex;
  justify-content: center;
}

.bento-search-box {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.bento-search-input {
  width: 100%;
  height: 46px;
  padding: 0 3.2rem 0 2.8rem;
  font-size: 0.95rem;
  font-family: var(--font-sans);
  color: var(--text-title);
  background-color: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

[data-theme="dark"] .bento-search-input {
  background-color: rgba(17, 24, 39, 0.7);
}

.bento-search-input:focus {
  background-color: var(--card-bg);
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--primary-blue-glow), 0 4px 12px rgba(14, 165, 233, 0.1);
}

.search-lens-svg {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-kbd-pill {
  position: absolute;
  right: 0.85rem;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--text-dim);
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
  pointer-events: none;
}

/* 右上角：显式用户登录/头像入口 (Explicit Top-Right) */
.header-right {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-shrink: 0;
}

.theme-circle-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-circle-btn:hover {
  color: var(--text-title);
  background: var(--bg-stage);
  transform: rotate(15deg);
}

.nav-login-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.1rem;
  border-radius: var(--radius-pill);
  font-size: 0.88rem;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 40px;
}

.nav-login-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.35);
}

.user-top-profile {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.admin-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary-blue);
  background: var(--primary-blue-light);
  border: 1px solid rgba(14, 165, 233, 0.25);
  text-decoration: none;
  transition: all 0.2s;
}

.admin-badge-pill:hover {
  background: rgba(14, 165, 233, 0.18);
  border-color: var(--primary-blue);
}

.avatar-ring {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
  border: 2px solid var(--card-bg);
}

.avatar-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-title);
}

.quick-logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--text-muted);
  text-decoration: none;
  background: transparent;
  transition: all 0.2s;
}

.quick-logout-btn:hover {
  color: var(--danger-color);
  background: rgba(239, 68, 68, 0.1);
}

/* ==========================================================================
   2. 主体舞台与控制中枢 (Bento Stage & Control Hub)
   ========================================================================== */
.bento-main-stage {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 6rem;
  width: 100%;
}

.bento-control-hub {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

/* 一级分类横向滚动胶囊条 (Mobile-Friendly Horizontal Ribbon) */
.category-scroll-ribbon {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 0.5rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.category-scroll-ribbon::-webkit-scrollbar {
  display: none;
}

.category-ribbon-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.2rem;
  border-radius: var(--radius-pill);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-body);
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
  min-height: 42px;
  cursor: pointer;
}

.category-ribbon-pill:hover {
  border-color: var(--primary-blue);
  color: var(--primary-blue);
  transform: translateY(-2px);
}

.category-ribbon-pill.active {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
  font-weight: 600;
}

.ribbon-icon {
  font-size: 0.95rem;
}

.category-add-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: 1px dashed var(--card-border);
  cursor: pointer;
  white-space: nowrap;
  min-height: 42px;
  transition: all 0.2s;
}

.category-add-pill:hover {
  border-color: var(--primary-blue);
  color: var(--primary-blue);
  background: var(--primary-blue-light);
}

/* 二级子分类智能展开行 */
.sub-ribbon-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.65rem 1rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.sub-ribbon-hint {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
}

.sub-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.8rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  text-decoration: none;
  transition: all 0.15s;
}

.sub-chip:hover {
  color: var(--primary-blue);
  border-color: var(--primary-blue);
}

.sub-chip.active {
  background: var(--primary-blue);
  color: #ffffff;
  border-color: transparent;
  font-weight: 600;
}

/* 过滤行与排序分段控制器 */
.bento-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.25rem;
}

.filter-row-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stage-tag {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-title);
  letter-spacing: -0.02em;
}

.doc-counter {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.doc-counter strong {
  color: var(--text-title);
  font-weight: 700;
}

.bento-sort-toggle {
  display: inline-flex;
  padding: 0.25rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-sm);
}

.sort-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.9rem;
  border-radius: var(--radius-pill);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-pill:hover {
  color: var(--text-title);
}

.sort-pill.active {
  background: var(--bg-stage);
  color: var(--text-title);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ==========================================================================
   3. 便当盒非对称网格 (Asymmetric Bento Box Grid)
   ========================================================================== */
.bento-viewport {
  width: 100%;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  grid-auto-flow: dense;
}

/* 便当盒卡片基底 (Bento Base Card) */
.bento-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-bento);
  padding: 1.6rem;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-bento);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;
  min-height: 220px;
  overflow: hidden;
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-bento-hover);
  border-color: var(--card-border-hover);
}

/* 非对称尺寸规则 */
/* 1. Hero 黄金主角卡片：跨 2 列，配有微渐变底光与丰富文案 */
.bento-card.bento-hero {
  grid-column: span 2;
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--card-bg) 70%, rgba(14, 165, 233, 0.04) 100%);
  border: 1px solid rgba(14, 165, 233, 0.22);
}

.bento-hero .card-title {
  font-size: 1.45rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.bento-hero-sub {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-top: 0.4rem;
}

/* 2. Wide 宽幅卡片：跨 2 列，杂志横版体验 */
.bento-card.bento-wide {
  grid-column: span 2;
}

.bento-wide .card-title {
  font-size: 1.25rem;
}

/* 3. Square 精致正方卡片：跨 1 列 */
.bento-card.bento-square {
  grid-column: span 1;
}

/* 卡片内部元素 */
.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.1rem;
}

.file-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  background-color: var(--primary-blue-light);
  color: var(--primary-blue);
  font-weight: 700;
  font-size: 0.76rem;
  font-family: var(--font-mono);
  border: 1px solid rgba(14, 165, 233, 0.2);
}

.card-status-badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.55rem;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 600;
}

.status-public {
  background-color: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.25);
}

.status-guest {
  background-color: rgba(100, 116, 139, 0.1);
  color: #475569;
  border: 1px solid rgba(100, 116, 139, 0.2);
}

.status-private {
  background-color: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.card-body-content {
  margin-bottom: 1.25rem;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-title);
  line-height: 1.4;
  letter-spacing: -0.015em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  transition: color 0.15s;
}

.bento-card:hover .card-title {
  color: var(--primary-blue);
}

.card-footer-row {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--card-border);
  font-size: 0.78rem;
}

.footer-left-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: var(--text-muted);
  background-color: var(--bg-stage);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-views {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--warm-orange);
  font-weight: 600;
  background: var(--warm-orange-light);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.views-count strong {
  font-weight: 800;
  color: var(--warm-orange);
}

.fire-vector-icon {
  filter: drop-shadow(0 1px 3px rgba(249, 115, 22, 0.4));
}

.card-meta-right {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  white-space: nowrap;
}

.meta-dot { color: var(--card-border); }

/* ==========================================================================
   4. 右下角呼吸高能光晕悬浮按钮 (Floating Action Button - FAB)
   ========================================================================== */
.fab-upload {
  position: fixed;
  bottom: 2.25rem;
  right: 2.25rem;
  z-index: 99;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  height: 56px;
  padding: 0 1.6rem 0 1.35rem;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, #f97316 0%, #ea580c 45%, #0284c7 100%);
  color: #ffffff;
  border: none;
  font-size: 0.98rem;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  box-shadow: var(--shadow-fab);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  outline: none;
}

.fab-upload:hover {
  transform: translateY(-4px) scale(1.04);
  box-shadow: 0 18px 36px -4px rgba(249, 115, 22, 0.55), 0 8px 18px -2px rgba(2, 132, 199, 0.35);
}

.fab-upload:active {
  transform: scale(0.96);
}

.fab-label {
  letter-spacing: -0.01em;
}

/* ==========================================================================
   5. 沉浸式单篇文档阅读器 (Reader View)
   ========================================================================== */
.reader-stage-center {
  max-width: 920px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
  width: 100%;
}

.reader-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  transition: all 0.2s;
}

.reader-back-btn:hover {
  color: var(--primary-blue);
  border-color: var(--primary-blue);
  background: var(--primary-blue-light);
}

.reader-view-container {
  width: 100%;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1.75rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--card-border);
}

.viewer-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-title);
  letter-spacing: -0.025em;
  margin-bottom: 0.75rem;
  line-height: 1.25;
}

.viewer-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.markdown-body {
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--text-body);
}

.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: var(--text-title);
  margin-top: 2rem;
  margin-bottom: 0.85rem;
  font-weight: 700;
  letter-spacing: -0.015em;
}

.markdown-body p { margin-bottom: 1.25rem; }
.markdown-body code {
  font-family: var(--font-mono);
  background: var(--bg-stage);
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  font-size: 0.88em;
  border: 1px solid var(--card-border);
}

.markdown-body pre {
  background: #0f172a;
  color: #f8fafc;
  padding: 1.4rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 1.5rem 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.markdown-body pre code {
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
}

/* ==========================================================================
   6. 模态框与通用表单 (Modals & Forms)
   ========================================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-content {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-bento);
  max-width: 760px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.35);
  animation: modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from { transform: scale(0.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  padding: 1.25rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--card-border);
}

.modal-body {
  padding: 1.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-footer {
  padding: 1rem 1.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--card-border);
}

.dropzone {
  border: 2px dashed var(--card-border);
  border-radius: var(--radius-md);
  padding: 2.5rem 1.5rem;
  text-align: center;
  background-color: var(--bg-stage);
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone:hover, .dropzone.dragover {
  border-color: var(--primary-blue);
  background-color: var(--primary-blue-light);
}

.form-control {
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--card-border);
  background-color: var(--card-bg);
  color: var(--text-title);
  font-size: 0.9rem;
  outline: none;
}

.form-control:focus {
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--primary-blue-glow);
}

/* 按钮规范 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.1rem;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--card-border);
  background-color: var(--card-bg);
  color: var(--text-title);
  text-decoration: none;
  transition: all 0.15s ease-in-out;
  min-height: 40px;
}

.btn:hover { background-color: var(--bg-stage); border-color: var(--card-border); }
.btn-primary { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-color: transparent; color: #ffffff; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3); }
.btn-danger { color: var(--danger-color); }
.btn-danger:hover { background-color: rgba(239, 68, 68, 0.1); border-color: var(--danger-color); }
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; min-height: 32px; }

/* 权限中心管理页 */
.admin-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  width: 100%;
}

.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.data-table th {
  background: var(--bg-stage);
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid var(--card-border);
}

.data-table td {
  padding: 0.85rem 1.15rem;
  border-bottom: 1px solid var(--card-border);
  color: var(--text-body);
}

.data-table tr:hover td {
  background: var(--bg-stage);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-primary { background: var(--primary-blue-light); color: var(--primary-blue); border: 1px solid rgba(14, 165, 233, 0.25); }
.badge-success { background: rgba(16, 185, 129, 0.1); color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.2); }
.badge-warning { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); }
.badge-danger { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.2); }
.badge-muted { background: var(--bg-stage); color: var(--text-muted); border: 1px solid var(--card-border); }

/* 空状态 */
.empty-state-card {
  text-align: center;
  padding: 4.5rem 2rem;
  color: var(--text-muted);
  background-color: var(--card-bg);
  border: 1px dashed var(--card-border);
  border-radius: var(--radius-bento);
  margin: 1.5rem 0;
  box-shadow: var(--shadow-sm);
  grid-column: span 3;
}

.empty-icon-wrap {
  display: inline-flex;
  padding: 1.25rem;
  border-radius: 50%;
  background: var(--bg-stage);
  color: var(--primary-blue);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-title);
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.9rem;
  max-width: 440px;
  margin: 0 auto;
  line-height: 1.6;
}

/* ==========================================================================
   7. Mobile-First 响应式断点规则 (@media)
   ========================================================================== */
@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-card.bento-hero,
  .bento-card.bento-wide {
    grid-column: span 2;
  }
  .bento-card.bento-square {
    grid-column: span 1;
  }
  .empty-state-card {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .bento-header {
    padding: 0.65rem 1rem;
  }

  .header-inner {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  /* 移动端搜索框占据次行全宽 */
  .header-center {
    order: 3;
    max-width: 100%;
    width: 100%;
  }

  .bento-search-input {
    height: 44px;
    font-size: 0.9rem;
  }

  /* 移动端 Bento 网格平滑降维为单列触摸 Feed */
  .bento-main-stage {
    padding: 1rem 1rem 5.5rem;
  }

  .bento-grid {
    grid-template-columns: 1fr;
    gap: 1.15rem;
  }

  .bento-card,
  .bento-card.bento-hero,
  .bento-card.bento-wide,
  .bento-card.bento-square {
    grid-column: span 1 !important;
    min-height: auto;
    padding: 1.35rem;
  }

  .empty-state-card {
    grid-column: span 1;
  }

  .fab-upload {
    bottom: 1.5rem;
    right: 1.5rem;
    height: 52px;
    padding: 0 1.25rem 0 1.1rem;
  }

  .category-scroll-ribbon {
    gap: 0.5rem;
  }

  .category-ribbon-pill {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    min-height: 40px;
  }

  .bento-filter-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .filter-row-right {
    width: 100%;
  }

  .bento-sort-toggle {
    width: 100%;
    justify-content: space-around;
  }

  .sort-pill {
    flex: 1;
    justify-content: center;
  }
}

/* ==========================================================================
   8. 极简现代 Auth 认证页面 (Login & Register Bento Aesthetic)
   ========================================================================== */
.auth-page-stage {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 15% 20%, rgba(249, 115, 22, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 85% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 40%),
              var(--bg-stage);
  padding: 1.5rem;
}

.auth-top-bar {
  max-width: 520px;
  width: 100%;
  margin: 0 auto 1.5rem;
}

.auth-card-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-bento-card {
  max-width: 460px;
  width: 100%;
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-bento);
  padding: 2.5rem 2.2rem;
  box-shadow: var(--shadow-bento-hover);
  position: relative;
  overflow: hidden;
}

.auth-bento-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #f97316 0%, #0ea5e9 100%);
}

.auth-brand-center {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-title);
  letter-spacing: -0.025em;
  margin-top: 1rem;
}

.auth-subtitle {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
  line-height: 1.5;
}

.auth-mode-segmented {
  display: flex;
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-pill);
  padding: 0.25rem;
  margin-bottom: 1.75rem;
}

.auth-mode-tab {
  flex: 1;
  text-align: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: var(--radius-pill);
  transition: all 0.2s;
}

.auth-mode-tab:hover {
  color: var(--text-title);
}

.auth-mode-tab.active {
  background: var(--card-bg);
  color: var(--text-title);
  box-shadow: var(--shadow-sm);
}

.auth-error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--danger-color);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.auth-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.auth-form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-title);
}

.auth-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-input-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.auth-input {
  width: 100%;
  height: 48px;
  padding: 0 1rem 0 2.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
  background-color: var(--bg-stage);
  color: var(--text-title);
  font-size: 0.92rem;
  font-family: var(--font-sans);
  outline: none;
  transition: all 0.2s;
}

.auth-input:focus {
  background-color: var(--card-bg);
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--primary-blue-glow);
}

.auth-submit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px;
  width: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: #ffffff;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: var(--font-sans);
  cursor: pointer;
  margin-top: 0.75rem;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
}

.auth-footer-hint {
  text-align: center;
  margin-top: 2rem;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.auth-hint-link {
  color: var(--primary-blue);
  font-weight: 600;
  text-decoration: none;
}

.auth-hint-link:hover {
  text-decoration: underline;
}

/* ==========================================================================
   9. Snowflake RBAC 权限中心 (Modern Bento Dashboard)
   ========================================================================== */
.rbac-page-stage {
  min-height: 100vh;
  background-color: var(--bg-stage);
  padding: 1.5rem 2rem 5rem;
}

.rbac-top-header {
  max-width: 1400px;
  margin: 0 auto 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--card-border);
}

.rbac-header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.rbac-header-titles {
  display: flex;
  flex-direction: column;
}

.rbac-main-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-title);
  letter-spacing: -0.025em;
}

.rbac-main-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.rbac-bento-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.rbac-bento-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .rbac-bento-grid-2 {
    grid-template-columns: 1fr;
  }
}

.rbac-card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-bento);
  padding: 2rem;
  box-shadow: var(--shadow-bento);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rbac-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--card-border);
}

.rbac-card-title-group {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.rbac-card-icon {
  font-size: 1.25rem;
}

.rbac-card-title {
  font-size: 1.15rem;
  font-weight: 750;
  color: var(--text-title);
}

.rbac-pill-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-pill);
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  color: var(--text-muted);
}

.rbac-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.rbac-form-row {
  display: flex;
  gap: 1rem;
}

@media (max-width: 600px) {
  .rbac-form-row {
    flex-direction: column;
  }
}

.rbac-select {
  height: 44px;
  padding: 0 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
  background-color: var(--bg-stage);
  color: var(--text-title);
  font-size: 0.88rem;
  font-family: var(--font-sans);
  outline: none;
  transition: all 0.2s;
  width: 100%;
}

.rbac-select:focus {
  background-color: var(--card-bg);
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px var(--primary-blue-glow);
}

.rbac-table-wrapper {
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.rbac-cell-title {
  font-weight: 600;
  color: var(--text-title);
}

.rbac-cell-sub {
  font-size: 0.74rem;
  font-family: var(--font-mono);
  color: var(--text-dim);
  margin-top: 0.15rem;
}

.rbac-actor-tag {
  font-size: 0.82rem;
  color: var(--text-body);
}

.rbac-time-cell {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.btn-revoke-pill {
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--danger-color);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-revoke-pill:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: var(--danger-color);
}

/* 诊断器样式 */
.diagnostic-empty-box {
  padding: 2.2rem 1.5rem;
  border: 1px dashed var(--card-border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.88rem;
  background: var(--bg-stage);
}

.diagnostic-active-box {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.diagnostic-header-bar {
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
}

.diagnostic-subject-line {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 0.6rem;
}

.diagnostic-subject-line strong {
  color: var(--text-title);
}

.diagnostic-roles-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-group-title {
  font-size: 0.78rem;
  color: var(--text-dim);
  font-weight: 600;
}

.diagnostic-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .diagnostic-metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-quad-card {
  padding: 1rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
  text-align: center;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
}

.metric-quad-card.granted {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
}

.metric-quad-card.denied {
  background: var(--bg-stage);
  border-color: var(--card-border);
}

.metric-quad-card.owner {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.3);
}

.metric-title {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
}

.metric-val {
  font-size: 1.15rem;
  font-weight: 800;
}

.metric-quad-card.granted .metric-val {
  color: var(--success-color);
}

.metric-quad-card.denied .metric-val {
  color: var(--text-dim);
}

.metric-quad-card.owner .metric-val {
  color: var(--warm-orange);
}

.metric-sub-tip {
  font-size: 0.68rem;
  color: var(--primary-blue);
  font-weight: 500;
}

.rbac-role-name {
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-title);
}

.rbac-desc-cell {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* ==========================================================================
   AI 经验摘要、智能标签集与 Skill 复用样式
   ========================================================================== */
.card-ai-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin-top: 0.45rem;
  padding: 0.45rem 0.65rem;
  background: rgba(14, 165, 233, 0.05);
  border: 1px dashed rgba(14, 165, 233, 0.25);
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  line-height: 1.45;
  color: var(--text-body);
}

.ai-spark-icon {
  font-size: 0.82rem;
  flex-shrink: 0;
}

.card-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.card-tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--primary-blue);
  text-decoration: none;
  transition: all 0.18s ease;
}

.card-tag-pill:hover {
  background: var(--primary-blue-light);
  border-color: var(--primary-blue);
}

.tags-ribbon-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.65rem;
  padding: 0.5rem 0.8rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
}

.tags-ribbon-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-right: 0.3rem;
}

.tag-pill-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.65rem;
  background: var(--bg-stage);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-body);
  text-decoration: none;
  transition: all 0.18s ease;
}

.tag-pill-chip:hover {
  border-color: var(--primary-blue);
  color: var(--primary-blue);
  background: var(--primary-blue-light);
}

.tag-pill-chip.active-tag-pill {
  background: var(--primary-blue);
  color: #ffffff;
  border-color: var(--primary-blue);
  font-weight: 600;
}

.tag-count {
  font-size: 0.68rem;
  opacity: 0.75;
}

.tag-close-x {
  font-size: 0.7rem;
  margin-left: 0.2rem;
}

.ai-expansion-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(14, 165, 233, 0.08));
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.8rem;
}

.banner-sparkle {
  font-size: 0.95rem;
}

.banner-title {
  font-weight: 600;
  color: var(--text-title);
}

.banner-keyword-pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.expanded-kw-pill {
  padding: 0.15rem 0.45rem;
  background: var(--card-bg);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  color: var(--primary-blue);
  font-weight: 500;
}

.viewer-ai-summary-box {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin-top: 0.85rem;
  padding: 0.75rem 1rem;
  background: rgba(14, 165, 233, 0.05);
  border-left: 3px solid var(--primary-blue);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-title);
}

.viewer-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.btn-copy-skill {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #ffffff !important;
  font-weight: 600;
  border: none;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.35);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-copy-skill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.45);
}

.btn-copy-skill.btn-copied {
  background: #10b981 !important;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35);
}
`;

