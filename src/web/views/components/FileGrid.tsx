import { FC } from 'hono/jsx';
import { DocumentMetadata } from '../../../services/document-service';
import { UserSession } from '../../../core/types';

interface FileGridProps {
  files: DocumentMetadata[];
  session?: UserSession;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export const FileGrid: FC<FileGridProps> = ({ files, session }) => {
  if (files.length === 0) {
    return (
      <div class="empty-state-card">
        <div class="empty-icon-wrap">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        </div>
        <h3 class="empty-title">{session ? '个人网盘暂无匹配文件' : '暂无公开技术笔记'}</h3>
        <p class="empty-subtitle">
          {session ? '可更换筛选条件，或点击右下角上传文件至您的私有网盘' : '站点目前未发布该分类下的公开文档'}
        </p>
      </div>
    );
  }

  return (
    <div class="bento-grid">
      {files.map((file, index) => {
        let bentoVariant = 'bento-square';
        if (index % 5 === 0) {
          bentoVariant = 'bento-hero';
        } else if (index % 5 === 3) {
          bentoVariant = 'bento-wide';
        }

        const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'md';
        const displayExt = `.${ext.toUpperCase()}`;

        // 格式色彩分类
        let badgeColorClass = 'badge-fmt-default';
        if (['pptx', 'ppt'].includes(ext)) badgeColorClass = 'badge-fmt-ppt';
        else if (['pdf'].includes(ext)) badgeColorClass = 'badge-fmt-pdf';
        else if (['docx', 'doc'].includes(ext)) badgeColorClass = 'badge-fmt-word';
        else if (['xlsx', 'xls', 'csv'].includes(ext)) badgeColorClass = 'badge-fmt-excel';
        else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) badgeColorClass = 'badge-fmt-archive';

        return (
          <div
            key={file.id}
            id={`file-card-${file.id}`}
            class={`bento-card ${bentoVariant}`}
            role="link"
            tabIndex={0}
            onclick={`if (!event.target.closest('button, a')) { window.location.href = '/files/${file.id}'; }`}
            onkeydown={`if (event.key === 'Enter' && !event.target.closest('button, a')) { window.location.href = '/files/${file.id}'; }`}
          >
            {/* 卡片顶部行：文件格式徽章、操作按纽与状态胶囊 */}
            <div class="card-header-row">
              <div class={`file-type-badge ${badgeColorClass}`}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="file-type-text">{displayExt}</span>
              </div>

              <div class="card-status-badges">
                {/* 直接下载原始文件按钮 */}
                <a
                  href={`/files/${file.id}/download`}
                  class="card-share-icon-btn card-download-btn"
                  title="下载原始文件"
                  onclick="event.stopPropagation();"
                  download={file.name}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>

                {/* 状态徽章 (Master 点击可快速切换公开/私有) */}
                {session ? (
                  <button
                    type="button"
                    class={`status-pill ${file.isPublic ? 'status-public' : 'status-private'}`}
                    title={file.isPublic ? "公开文件 (点击设为私有)" : "私有文件 (点击设为公开)"}
                    onclick="event.stopPropagation(); event.preventDefault();"
                    hx-post={`/files/${file.id}/toggle-public`}
                    hx-target={`#file-card-${file.id}`}
                    hx-swap="outerHTML"
                  >
                    {file.isPublic ? (
                      <>
                        <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5" />
                          <path d="M1 8h14M8 1a10 10 0 0 1 0 14M8 1a10 10 0 0 0 0 14" fill="none" stroke="currentColor" stroke-width="1.2" />
                        </svg>
                        <span>公开</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                          <rect x="3" y="6" width="10" height="9" rx="2" />
                          <path d="M5 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5" />
                        </svg>
                        <span>私有</span>
                      </>
                    )}
                  </button>
                ) : file.isPublic ? (
                  <span class="status-pill status-public">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5" />
                      <path d="M1 8h14M8 1a10 10 0 0 1 0 14M8 1a10 10 0 0 0 0 14" fill="none" stroke="currentColor" stroke-width="1.2" />
                    </svg>
                    <span>公开</span>
                  </span>
                ) : null}

                {/* 快捷复制分享链接 */}
                <button
                  type="button"
                  class="card-share-icon-btn"
                  title="复制链接"
                  onclick={`
                    event.stopPropagation();
                    event.preventDefault();
                    const url = window.location.origin + '/files/${file.id}';
                    navigator.clipboard.writeText(url).then(() => {
                      const el = this;
                      el.style.color = '#10b981';
                      el.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                      setTimeout(() => {
                        el.style.color = '';
                        el.style.borderColor = '';
                      }, 1500);
                    });
                  `}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>

                {/* Master 展示删除按钮 */}
                {session && (
                  <button
                    type="button"
                    class="card-delete-icon-btn"
                    title="彻底删除此文件"
                    onclick="event.stopPropagation(); event.preventDefault();"
                    hx-delete={`/files/${file.id}`}
                    hx-confirm={`确定要从个人网盘彻底删除「${file.title || file.name}」吗？`}
                    hx-target="#drive-main-container"
                    hx-swap="outerHTML"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* 卡片主体：加粗现代标题与标签、AI 摘要 */}
            <div class="card-body-content">
              <h3 class="card-title" title={file.title || file.name}>
                {file.title || file.name}
              </h3>
              {file.aiSummary ? (
                <div class="card-ai-summary" title={file.aiSummary}>
                  <span class="ai-spark-icon">✨</span>
                  <span class="summary-text">{file.aiSummary}</span>
                </div>
              ) : bentoVariant === 'bento-hero' ? (
                <p class="bento-hero-sub">
                  点击立即开启沉浸式 Markdown 阅读体验 · 支持数学公式与代码高亮
                </p>
              ) : null}

              {file.tags && file.tags.length > 0 && (
                <div class="card-tags-list">
                  {file.tags.map((t) => (
                    <span key={t} class="card-tag-pill">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>


            {/* 卡片底栏：四角平滑内嵌元数据 */}
            <div class="card-footer-row">
              <div class="footer-left-group">
                <span class="card-date-chip" style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; color: var(--text-muted);">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{formatDate(file.createdAt)}</span>
                </span>

                <div class="card-views" title="累计阅读与点击量">
                  <svg class="fire-vector-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                      fill="#f97316"
                    />
                    <path
                      d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                      stroke="#ea580c"
                      stroke-width="1.8"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span class="views-count"><strong>{file.views || 0}</strong></span>
                </div>
              </div>

              <div class="card-meta-right">
                <span>{formatDate(file.createdAt)}</span>
                <span class="meta-dot">·</span>
                <span>{formatBytes(file.size)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
