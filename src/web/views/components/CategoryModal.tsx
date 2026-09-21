import { FC } from 'hono/jsx';
import { CategoryTreeItem } from '../../../modules/document/domain/category';

export interface CategoryModalProps {
  categories: CategoryTreeItem[];
  successMessage?: string;
}

export const CategoryModal: FC<CategoryModalProps> = ({ categories, successMessage }) => {
  return (
    <div id="category-modal" class="modal-overlay" onclick="if(event.target === this) this.remove()">
      <div class="modal-content" style="max-width: 550px;">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <span>📁 分类管理</span>
            <span class="brand-badge">二层结构</span>
          </h3>
          <button class="btn btn-sm" onclick="document.getElementById('category-modal').remove()">✕</button>
        </div>

        <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.25rem;">
          {successMessage && (
            <div style="font-size: 0.85rem; padding: 0.6rem 0.85rem; background: rgba(63, 185, 80, 0.15); color: var(--success-color); border: 1px solid var(--success-color); border-radius: var(--radius-sm);">
              ✅ {successMessage}
            </div>
          )}

          {/* 新增分类表单 */}
          <form
            hx-post="/categories"
            hx-target="#modal-container"
            hx-swap="innerHTML"
            style="display: flex; flex-direction: column; gap: 0.75rem; background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);"
          >
            <div style="font-weight: 600; font-size: 0.9rem;">➕ 新建文档分类</div>

            <div class="form-group">
              <label class="form-label">分类名称：</label>
              <input
                type="text"
                name="name"
                class="form-control"
                placeholder="例如：系统架构、算法设计、前端交互..."
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">所属上级（不选即创建一级分类）：</label>
              <select name="parentId" class="form-control">
                <option value="">📁 无 (作为独立一级分类)</option>
                {categories.map(cat => (
                  <option value={cat.id} key={cat.id}>
                    ↳ 归属于一级分类：{cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;">
              <button type="submit" class="btn btn-primary btn-sm">
                保存并生效
              </button>
            </div>
          </form>

          {/* 现有分类一览 */}
          <div>
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              现有分类层级一览：
            </div>
            <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>分类名称</th>
                    <th>层级</th>
                    <th style="text-align: right;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <>
                      <tr key={cat.id}>
                        <td style="font-weight: 600;">
                          📂 {cat.name}
                        </td>
                        <td>
                          <span class="badge badge-primary">一级分类</span>
                        </td>
                        <td style="text-align: right;">
                          {cat.id !== 'cat_uncategorized' && (
                            <button
                              class="btn btn-sm btn-danger"
                              style="padding: 0.15rem 0.4rem; font-size: 0.7rem;"
                              hx-delete={`/categories/${cat.id}`}
                              hx-target="#modal-container"
                              hx-swap="innerHTML"
                              hx-confirm={`确定删除一级分类「${cat.name}」及其下所有二级分类吗？关联文档将自动安全移入未分类。`}
                            >
                              删除
                            </button>
                          )}
                        </td>
                      </tr>
                      {cat.children && cat.children.map(sub => (
                        <tr key={sub.id}>
                          <td style="padding-left: 2rem; color: var(--text-secondary);">
                            ↳ 🏷️ {sub.name}
                          </td>
                          <td>
                            <span class="badge badge-muted">二级子分类</span>
                          </td>
                          <td style="text-align: right;">
                            <button
                              class="btn btn-sm btn-danger"
                              style="padding: 0.15rem 0.4rem; font-size: 0.7rem;"
                              hx-delete={`/categories/${sub.id}`}
                              hx-target="#modal-container"
                              hx-swap="innerHTML"
                              hx-confirm={`确定删除二级分类「${sub.name}」吗？关联文档将自动安全移入未分类。`}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
