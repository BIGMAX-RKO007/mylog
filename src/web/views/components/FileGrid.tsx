import { FC } from 'hono/jsx';
import { DocumentMetadata } from '../../../modules/document/domain/types';

interface FileGridProps {
  files: DocumentMetadata[];
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

export const FileGrid: FC<FileGridProps> = ({ files }) => {
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
        <h3 class="empty-title">未检索到匹配的 Markdown 文档</h3>
        <p class="empty-subtitle">尝试更换分类或调整搜索关键词，或点击右上角上传新文档</p>
      </div>
    );
  }

  return (
    <div class="bento-grid">
      {files.map((file, index) => {
        // Bento 非对称排版策略：首张或每隔 5 张呈现为跨两列的 Hero 卡片，第 4 张呈现为宽版 Wide 卡片，其余为精致 Square 卡片
        let bentoVariant = 'bento-square';
        if (index % 5 === 0) {
          bentoVariant = 'bento-hero';
        } else if (index % 5 === 3) {
          bentoVariant = 'bento-wide';
        }

        return (
          <a
            key={file.id}
            id={`file-card-${file.id}`}
            href={`/files/${file.id}`}
            class={`bento-card ${bentoVariant}`}
          >
            {/* 卡片顶部行：文件格式徽章与权限状态胶囊 */}
            <div class="card-header-row">
              <div class="file-type-badge">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="file-type-text">.MD</span>
              </div>

              <div class="card-status-badges">
                {file.ownerRoleId === 'rol_public' ? (
                  <span class="status-pill status-guest">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4z" />
                    </svg>
                    游客
                  </span>
                ) : file.isPublic ? (
                  <span class="status-pill status-public">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5" />
                      <path d="M1 8h14M8 1a10 10 0 0 1 0 14M8 1a10 10 0 0 0 0 14" fill="none" stroke="currentColor" stroke-width="1.2" />
                    </svg>
                    公开
                  </span>
                ) : (
                  <span class="status-pill status-private">
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor">
                      <rect x="3" y="6" width="10" height="9" rx="2" />
                      <path d="M5 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5" />
                    </svg>
                    私有
                  </span>
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
          </a>
        );
      })}
    </div>
  );
};
