import { FC } from 'hono/jsx';
import { ParsedDocument } from '../../../modules/document/domain/types';

export interface UploadModalProps {
  isGuest?: boolean;
}

export const UploadModal: FC<UploadModalProps> = ({ isGuest }) => {
  return (
    <div id="upload-modal" class="modal-overlay" onclick="if(event.target === this) this.remove()">
      <div class="modal-content">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 600;">📤 上传 Markdown 文档</h3>
          <button class="btn btn-sm" onclick="document.getElementById('upload-modal').remove()">✕</button>
        </div>

        <div id="upload-modal-body" class="modal-body">
          {isGuest && (
            <div style="font-size: 0.8rem; padding: 0.5rem 0.75rem; background: rgba(59, 130, 246, 0.1); color: var(--accent-color); border-radius: var(--radius-sm); margin-bottom: 1rem; border: 1px solid rgba(59, 130, 246, 0.2);">
              ℹ️ <strong>游客免登上传</strong>：文件入库后将公开在知识库中供访客阅读；登录后可拥有专属私密文件与完整管理特权。
            </div>
          )}
          {/* 上传表单 */}
          <form
            id="preview-upload-form"
            hx-post="/files/preview"
            hx-encoding="multipart/form-data"
            hx-target="#upload-modal-body"
            hx-swap="innerHTML"
            hx-indicator="#upload-spinner"
          >
            <div
              class="dropzone"
              onclick="document.getElementById('file-input').click()"
              ondragover="event.preventDefault(); this.classList.add('dragover')"
              ondragleave="this.classList.remove('dragover')"
              ondrop="
                event.preventDefault();
                this.classList.remove('dragover');
                const file = event.dataTransfer.files[0];
                if (file && (file.name.endsWith('.md') || file.name.endsWith('.markdown'))) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  const fi = document.getElementById('file-input');
                  fi.files = dt.files;
                  htmx.trigger('#preview-upload-form', 'submit');
                } else {
                  alert('请上传 .md 或 .markdown 格式的文件');
                }
              "
            >
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
              <p style="font-weight: 600; font-size: 1rem; margin-bottom: 0.25rem;">
                点击选择 或 拖拽 Markdown 文件至此
              </p>
              <p style="font-size: 0.8rem; color: var(--text-secondary);">
                仅支持纯粹的 .md 文本文件，选择后将立即为您生成排版预览
              </p>
              <input
                id="file-input"
                type="file"
                name="file"
                accept=".md,.markdown,text/markdown"
                style="display: none;"
                onchange="htmx.trigger('#preview-upload-form', 'submit')"
              />
            </div>
            <div id="upload-spinner" class="htmx-indicator" style="text-align: center; margin-top: 1rem; color: var(--text-secondary);">
              ⏳ 正在解析 Markdown 排版并生成预览...
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

import { CategoryTreeItem } from '../../../modules/document/domain/category';

interface UploadPreviewProps {
  fileName: string;
  parsed: ParsedDocument;
  uploadToken: string;
  categories?: CategoryTreeItem[];
}

export const UploadPreviewCard: FC<UploadPreviewProps> = ({ fileName, parsed, uploadToken, categories = [] }) => {
  return (
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">即时解析预览</span>
          <h2 style="font-size: 1.25rem; font-weight: 600;">{parsed.title}</h2>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
            <span>原文件名: {fileName}</span> · <span>约 {parsed.wordCount} 字</span> · <span>体积 {(parsed.size / 1024).toFixed(1)} KB</span>
          </div>
        </div>
        <span class="brand-badge" style="background: rgba(63, 185, 80, 0.15); color: var(--success-color); border-color: var(--success-color);">
          尚未入库
        </span>
      </div>

      {/* 渲染预览的 Markdown 正文 */}
      <div
        class="markdown-body"
        style="max-height: 40vh; overflow-y: auto; padding: 1rem; background-color: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color);"
        dangerouslySetInnerHTML={{ __html: parsed.renderedHtml }}
      ></div>

      {/* 确认提交表单，包含分类选择 */}
      <form
        id="confirm-upload-form"
        hx-post="/files/confirm"
        hx-target="#drive-main-container"
        hx-swap="innerHTML"
        hx-indicator="#confirm-spinner"
        style="margin-top: 1.25rem;"
      >
        <input type="hidden" name="uploadToken" value={uploadToken} />

        <input type="hidden" name="categoryId" value="cat_uncategorized" />
        <div style="background-color: var(--bg-tertiary); padding: 0.75rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
          <span>🏷️</span>
          <span>系统将优先提取 YAML Frontmatter 标签；无标签时自动由 Workers AI 提炼核心主题标签并向量化聚类。</span>
        </div>

        {/* 操作按钮区 */}
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button
            type="button"
            class="btn"
            onclick="document.getElementById('upload-modal').remove()"
          >
            取消放弃
          </button>
          <button type="submit" class="btn btn-primary">
            ✅ 确认入库到网盘
          </button>
        </div>
      </form>

      <div id="confirm-spinner" class="htmx-indicator" style="text-align: right; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
        ⏳ 正在持久化存入 Cloudflare R2 并登记元数据...
      </div>
    </div>
  );
};
