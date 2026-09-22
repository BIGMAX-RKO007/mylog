import { FC } from 'hono/jsx';
import { DocumentMetadata, ParsedDocument } from '../../../modules/document/domain/types';

interface FileViewerProps {
  metadata: DocumentMetadata;
  parsed: ParsedDocument;
  isOwner: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileViewer: FC<FileViewerProps> = ({ metadata, parsed, isOwner }) => {
  return (
    <div id="file-viewer-content" class="reader-view-container">
      <div class="reader-back-bar">
        <a href="/" class="btn btn-sm">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>返回大厅网格</span>
        </a>
        <div style="display: flex; gap: 0.65rem; align-items: center;">
          <span class="card-views" style="font-size: 0.85rem;">
            <svg class="fire-vector-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z" fill="#f97316"/>
              <path d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z" stroke="#ea580c" stroke-width="1.8"/>
            </svg>
            <span class="views-count"><strong>{metadata.views || 0}</strong> 次阅读</span>
          </span>
        </div>
      </div>

      <div class="viewer-header">
        <div>
          <h1 class="viewer-title">{parsed.title}</h1>
          <div class="viewer-meta">
            <span>📄 {metadata.name}</span>
            <span>·</span>
            <span>{formatBytes(metadata.size)}</span>
            <span>·</span>
            <span>约 {parsed.wordCount} 字</span>
            <span>·</span>
            <span>{new Date(metadata.createdAt).toLocaleString('zh-CN')}</span>
            {metadata.isPublic ? (
              <span class="badge-public">公开可读</span>
            ) : (
              <span class="badge badge-private">私有</span>
            )}
          </div>

          {/* AI 核心经验摘要与标签栏 */}
          {metadata.aiSummary && (
            <div class="viewer-ai-summary-box">
              <span class="ai-spark-icon">✨</span>
              <div class="summary-text">
                <strong>经验概括：</strong>{metadata.aiSummary}
              </div>
            </div>
          )}

          {metadata.tags && metadata.tags.length > 0 && (
            <div class="viewer-tags-row">
              {metadata.tags.map((t) => (
                <a key={t} href={`/?tag=${encodeURIComponent(t)}`} class="card-tag-pill">
                  #{t}
                </a>
              ))}
            </div>
          )}
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          {/* 一键复制为 AI Skill / Prompt 规范 (拿来即用) */}
          <button
            type="button"
            id="copy-skill-btn"
            class="btn btn-sm btn-copy-skill"
            title="一键复制为标准 AI 提示词规范，直接喂给下一个 AI 任务"
            onclick={`
              const skillText = \`---
title: ${metadata.title.replace(/[`"'\\]/g, '')}
tags: [${(metadata.tags || []).join(', ')}]
summary: ${(metadata.aiSummary || '').replace(/[`"'\\]/g, '')}
verified: true
---

\${document.getElementById('raw-markdown-cache').textContent}\`;
              navigator.clipboard.writeText(skillText).then(() => {
                const btn = document.getElementById('copy-skill-btn');
                const oldHtml = btn.innerHTML;
                btn.innerHTML = '✓ 已复制为 Skill 规范';
                btn.classList.add('btn-copied');
                setTimeout(() => {
                  btn.innerHTML = oldHtml;
                  btn.classList.remove('btn-copied');
                }, 2000);
              });
            `}
          >
            <span>✨ 复制为 AI Skill</span>
          </button>

          {/* 下载原始 MD */}
          <a href={`/files/${metadata.id}/raw`} target="_blank" class="btn btn-sm">
            💾 原始文件
          </a>

          {/* 拥有者特有控制权 (Snowflake OWNERSHIP 特权) */}
          {isOwner && (
            <>
              {/* 一键切换公开只读 (赋予/撤销 PUBLIC 角色的 READ 特权) */}
              <button
                class="btn btn-sm"
                hx-post={`/files/${metadata.id}/toggle-share`}
                hx-target="#file-viewer-content"
                hx-swap="outerHTML"
              >
                {metadata.isPublic ? '🔒 设为私有' : '🔗 公开分享'}
              </button>

              {/* 删除按钮 */}
              <button
                class="btn btn-sm btn-danger"
                hx-delete={`/files/${metadata.id}`}
                hx-confirm="确定要彻底从存储桶与数据库中删除此文档吗？"
                hx-target="#drive-main-container"
                hx-swap="innerHTML"
              >
                🗑️ 删除
              </button>
            </>
          )}
        </div>
      </div>

      {/* 隐藏的 Raw Markdown 缓存供一键复制为 Skill */}
      <script type="text/plain" id="raw-markdown-cache">
        {parsed.rawMarkdown}
      </script>


      {/* 渲染后的高质感 Markdown HTML 正文 */}
      <div class="markdown-body" dangerouslySetInnerHTML={{ __html: parsed.renderedHtml }}></div>
    </div>
  );
};
