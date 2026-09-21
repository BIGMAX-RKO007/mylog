import { FC } from 'hono/jsx';
import { DocumentMetadata } from '../../../modules/document/domain/types';

interface FileListProps {
  files: DocumentMetadata[];
  activeFileId?: string;
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

export const FileList: FC<FileListProps> = ({ files, activeFileId }) => {
  if (files.length === 0) {
    return (
      <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
        <p>📭 暂无 Markdown 文档</p>
        <p style="margin-top: 0.5rem; font-size: 0.75rem;">点击上方“上传 Markdown”开始存储</p>
      </div>
    );
  }

  return (
    <>
      {files.map((file) => (
        <a
          key={file.id}
          id={`file-item-${file.id}`}
          href={`/files/${file.id}`}
          class={`file-item ${activeFileId === file.id ? 'active' : ''}`}
          hx-get={`/files/${file.id}`}
          hx-target="#viewer-container"
          hx-swap="innerHTML"
          hx-push-url="true"
          onclick="
            document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            const v = document.getElementById('viewer-pane');
            if (v) v.classList.add('mobile-active');
          "
        >
          <div class="file-item-header">
            <span class="file-item-title">{file.title || file.name}</span>
            <div style="display: flex; gap: 0.35rem; align-items: center; flex-shrink: 0;">
              {file.categoryName && (
                <span class="badge badge-muted" style="font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px;">
                  📁 {file.parentCategoryName ? `${file.parentCategoryName} / ${file.categoryName}` : file.categoryName}
                </span>
              )}
              {file.ownerRoleId === 'rol_public' ? (
                <span class="badge-public" style="background: rgba(148, 163, 184, 0.15); color: var(--text-secondary); border-color: rgba(148, 163, 184, 0.3);">游客上传</span>
              ) : file.isPublic ? (
                <span class="badge-public">公开</span>
              ) : (
                <span class="brand-badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border-color: rgba(239, 68, 68, 0.3); font-size: 0.65rem;">私有</span>
              )}
            </div>
          </div>
          <div class="file-item-meta">
            <span>📄 {file.name}</span>
            <span>·</span>
            <span>{formatBytes(file.size)}</span>
            <span>·</span>
            <span>{formatDate(file.createdAt)}</span>
          </div>
        </a>
      ))}
    </>
  );
};
