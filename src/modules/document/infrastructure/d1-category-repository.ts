import { CategoryRepositoryPort } from '../ports/category-repository';
import { Category, CategoryTreeItem } from '../domain/category';

export class D1CategoryRepository implements CategoryRepositoryPort {
  constructor(private db: D1Database) {}

  async listAll(): Promise<Category[]> {
    const { results } = await this.db
      .prepare('SELECT id, name, parent_id, order_index, created_at FROM categories ORDER BY order_index ASC, created_at ASC')
      .all<{
        id: string;
        name: string;
        parent_id: string | null;
        order_index: number;
        created_at: number;
      }>();

    return results.map(r => ({
      id: r.id,
      name: r.name,
      parentId: r.parent_id,
      orderIndex: r.order_index,
      createdAt: r.created_at,
    }));
  }

  async getTree(): Promise<CategoryTreeItem[]> {
    const all = await this.listAll();
    const parents = all.filter(c => !c.parentId);
    const children = all.filter(c => !!c.parentId);

    return parents.map(p => ({
      id: p.id,
      name: p.name,
      parentId: null,
      orderIndex: p.orderIndex,
      children: children
        .filter(c => c.parentId === p.id)
        .map(c => ({
          id: c.id,
          name: c.name,
          parentId: p.id,
          orderIndex: c.orderIndex,
          children: [],
        })),
    }));
  }

  async create(name: string, parentId?: string | null): Promise<Category> {
    const id = `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = Date.now();
    const cleanParentId = parentId && parentId.trim() ? parentId.trim() : null;

    await this.db
      .prepare('INSERT INTO categories (id, name, parent_id, order_index, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, name.trim(), cleanParentId, 10, now)
      .run();

    return {
      id,
      name: name.trim(),
      parentId: cleanParentId,
      orderIndex: 10,
      createdAt: now,
    };
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.db
      .prepare('SELECT id, name, parent_id, order_index, created_at FROM categories WHERE id = ?')
      .bind(id)
      .first<{
        id: string;
        name: string;
        parent_id: string | null;
        order_index: number;
        created_at: number;
      }>();

    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      orderIndex: row.order_index,
      createdAt: row.created_at,
    };
  }

  async delete(id: string): Promise<void> {
    // 保护默认未分类不被删除
    if (id === 'cat_uncategorized') {
      return;
    }

    // 将该分类及子分类下的文档安全移至未分类
    await this.db.batch([
      this.db
        .prepare(`
          UPDATE files 
          SET category_id = 'cat_uncategorized' 
          WHERE category_id = ? 
             OR category_id IN (SELECT id FROM categories WHERE parent_id = ?)
        `)
        .bind(id, id),
      this.db
        .prepare('DELETE FROM categories WHERE id = ?')
        .bind(id),
    ]);
  }
}
