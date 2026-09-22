import { DocumentRepositoryPort } from '../ports/document-repository';
import { DocumentMetadata } from '../domain/types';

export class D1DocumentRepository implements DocumentRepositoryPort {
  constructor(private db: D1Database) {}

  async create(doc: DocumentMetadata, ownerRoleId: string, creatorUserId: string): Promise<void> {
    const grantId = `grt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const categoryId = doc.categoryId && doc.categoryId.trim() ? doc.categoryId.trim() : 'cat_uncategorized';

    // 原子批量写入: securable_objects + files + 初始 OWNERSHIP 授权
    await this.db.batch([
      this.db
        .prepare('INSERT INTO securable_objects (id, object_type, owner_role_id, created_at) VALUES (?, ?, ?, ?)')
        .bind(doc.id, 'FILE', ownerRoleId, doc.createdAt),
      this.db
        .prepare('INSERT INTO files (id, name, title, size, r2_key, sha256, is_public, category_id, views, ai_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(doc.id, doc.name, doc.title, doc.size, doc.r2Key, doc.sha256, doc.isPublic ? 1 : 0, categoryId, doc.views || 0, doc.aiSummary || null, doc.createdAt, doc.updatedAt),
      this.db
        .prepare('INSERT INTO grants (id, role_id, object_id, privilege, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(grantId, ownerRoleId, doc.id, 'OWNERSHIP', creatorUserId, doc.createdAt),
    ]);
  }

  async findById(id: string): Promise<DocumentMetadata | null> {
    const row = await this.db
      .prepare(`
        SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public, 
               f.category_id, c.name as category_name, pc.name as parent_category_name,
               f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
               (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
        FROM files f
        JOIN securable_objects so ON f.id = so.id
        LEFT JOIN categories c ON f.category_id = c.id
        LEFT JOIN categories pc ON c.parent_id = pc.id
        WHERE f.id = ?
      `)
      .bind(id)
      .first<{
        id: string;
        name: string;
        title: string;
        size: number;
        r2_key: string;
        sha256: string;
        is_public: number;
        category_id: string | null;
        category_name: string | null;
        parent_category_name: string | null;
        views: number;
        ai_summary: string | null;
        owner_role_id: string;
        tag_names: string | null;
        created_at: number;
        updated_at: number;
      }>();

    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      size: row.size,
      r2Key: row.r2_key,
      sha256: row.sha256,
      isPublic: row.is_public === 1,
      ownerRoleId: row.owner_role_id,
      categoryId: row.category_id || 'cat_uncategorized',
      categoryName: row.category_name || '未分类',
      parentCategoryName: row.parent_category_name || undefined,
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async incrementViews(id: string): Promise<void> {
    await this.db
      .prepare('UPDATE files SET views = views + 1 WHERE id = ?')
      .bind(id)
      .run();
  }

  async updateAiSummary(id: string, summary: string): Promise<void> {
    await this.db
      .prepare('UPDATE files SET ai_summary = ?, updated_at = ? WHERE id = ?')
      .bind(summary, Date.now(), id)
      .run();
  }

  async attachTags(fileId: string, tagNames: string[]): Promise<void> {
    if (!tagNames || tagNames.length === 0) return;

    const now = Date.now();
    for (const rawName of tagNames) {
      const name = rawName.trim();
      if (!name) continue;

      let tag = await this.db
        .prepare('SELECT id FROM tags WHERE name = ?')
        .bind(name)
        .first<{ id: string }>();

      let tagId: string;
      if (!tag) {
        tagId = `tag_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
        await this.db
          .prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, 1, ?)')
          .bind(tagId, name, now)
          .run();
      } else {
        tagId = tag.id;
        await this.db
          .prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?')
          .bind(tagId)
          .run();
      }

      await this.db
        .prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id, created_at) VALUES (?, ?, ?)')
        .bind(fileId, tagId, now)
        .run();
    }
  }

  async listPopularTags(limit: number = 20): Promise<{ name: string; count: number }[]> {
    // 仅聚合当前真实被文档关联的有效标签 (杜绝孤儿标签残留)
    const { results } = await this.db
      .prepare(`
        SELECT t.name, COUNT(ft.file_id) as count
        FROM tags t
        JOIN file_tags ft ON t.id = ft.tag_id
        GROUP BY t.id, t.name
        HAVING count > 0
        ORDER BY count DESC, t.created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all<{ name: string; count: number }>();

    return results || [];
  }

  async listAccessible(
    userId: string,
    search?: string,
    categoryId?: string,
    sort?: 'latest' | 'views',
    tag?: string
  ): Promise<DocumentMetadata[]> {
    let query = `
      WITH RECURSIVE user_effective_roles AS (
        SELECT role_id FROM user_roles WHERE user_id = ?
        UNION
        SELECT ri.child_role_id
        FROM role_inheritance ri
        JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
      )
      SELECT DISTINCT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.category_id, c.name as category_name, pc.name as parent_category_name,
             f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
             (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      LEFT JOIN grants g ON g.object_id = f.id
      WHERE (
        (g.role_id IN (SELECT role_id FROM user_effective_roles) AND g.privilege IN ('READ', 'OWNERSHIP'))
        OR f.is_public = 1
      )
    `;

    const params: unknown[] = [userId];

    if (search && search.trim()) {
      query += ` AND (f.title LIKE ? OR f.name LIKE ? OR f.ai_summary LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (tag && tag.trim()) {
      query += ` AND f.id IN (SELECT ft.file_id FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE t.name = ?)`;
      params.push(tag.trim());
    }

    if (categoryId && categoryId.trim()) {
      query += ` AND (f.category_id = ? OR f.category_id IN (SELECT id FROM categories WHERE parent_id = ?))`;
      params.push(categoryId.trim(), categoryId.trim());
    }

    const orderBy = sort === 'views' ? 'f.views DESC, f.created_at DESC' : 'f.created_at DESC';
    query += ` ORDER BY ${orderBy}`;

    const { results } = await this.db.prepare(query).bind(...params).all<{
      id: string;
      name: string;
      title: string;
      size: number;
      r2_key: string;
      sha256: string;
      is_public: number;
      category_id: string | null;
      category_name: string | null;
      parent_category_name: string | null;
      views: number;
      ai_summary: string | null;
      owner_role_id: string;
      tag_names: string | null;
      created_at: number;
      updated_at: number;
    }>();

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      size: row.size,
      r2Key: row.r2_key,
      sha256: row.sha256,
      isPublic: row.is_public === 1,
      ownerRoleId: row.owner_role_id,
      categoryId: row.category_id || 'cat_uncategorized',
      categoryName: row.category_name || '未分类',
      parentCategoryName: row.parent_category_name || undefined,
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listPublic(
    search?: string,
    categoryId?: string,
    sort?: 'latest' | 'views',
    tag?: string
  ): Promise<DocumentMetadata[]> {
    let query = `
      SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.category_id, c.name as category_name, pc.name as parent_category_name,
             f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
             (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE f.is_public = 1
    `;

    const params: unknown[] = [];

    if (search && search.trim()) {
      query += ` AND (f.title LIKE ? OR f.name LIKE ? OR f.ai_summary LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (tag && tag.trim()) {
      query += ` AND f.id IN (SELECT ft.file_id FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE t.name = ?)`;
      params.push(tag.trim());
    }

    if (categoryId && categoryId.trim()) {
      query += ` AND (f.category_id = ? OR f.category_id IN (SELECT id FROM categories WHERE parent_id = ?))`;
      params.push(categoryId.trim(), categoryId.trim());
    }

    const orderBy = sort === 'views' ? 'f.views DESC, f.created_at DESC' : 'f.created_at DESC';
    query += ` ORDER BY ${orderBy}`;

    const { results } = await this.db.prepare(query).bind(...params).all<{
      id: string;
      name: string;
      title: string;
      size: number;
      r2_key: string;
      sha256: string;
      is_public: number;
      category_id: string | null;
      category_name: string | null;
      parent_category_name: string | null;
      views: number;
      ai_summary: string | null;
      owner_role_id: string;
      tag_names: string | null;
      created_at: number;
      updated_at: number;
    }>();

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      size: row.size,
      r2Key: row.r2_key,
      sha256: row.sha256,
      isPublic: true,
      ownerRoleId: row.owner_role_id,
      categoryId: row.category_id || 'cat_uncategorized',
      categoryName: row.category_name || '未分类',
      parentCategoryName: row.parent_category_name || undefined,
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listAll(
    categoryId?: string,
    sort?: 'latest' | 'views',
    tag?: string
  ): Promise<DocumentMetadata[]> {
    let query = `
      SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.category_id, c.name as category_name, pc.name as parent_category_name,
             f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
             (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
    `;

    const params: unknown[] = [];

    if (tag && tag.trim()) {
      query += ` WHERE f.id IN (SELECT ft.file_id FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE t.name = ?)`;
      params.push(tag.trim());
    }

    if (categoryId && categoryId.trim()) {
      query += tag && tag.trim() ? ` AND ` : ` WHERE `;
      query += `(f.category_id = ? OR f.category_id IN (SELECT id FROM categories WHERE parent_id = ?))`;
      params.push(categoryId.trim(), categoryId.trim());
    }

    const orderBy = sort === 'views' ? 'f.views DESC, f.created_at DESC' : 'f.created_at DESC';
    query += ` ORDER BY ${orderBy}`;

    const { results } = await this.db.prepare(query).bind(...params).all<{
      id: string;
      name: string;
      title: string;
      size: number;
      r2_key: string;
      sha256: string;
      is_public: number;
      category_id: string | null;
      category_name: string | null;
      parent_category_name: string | null;
      views: number;
      ai_summary: string | null;
      owner_role_id: string;
      tag_names: string | null;
      created_at: number;
      updated_at: number;
    }>();

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      size: row.size,
      r2Key: row.r2_key,
      sha256: row.sha256,
      isPublic: row.is_public === 1,
      ownerRoleId: row.owner_role_id,
      categoryId: row.category_id || 'cat_uncategorized',
      categoryName: row.category_name || '未分类',
      parentCategoryName: row.parent_category_name || undefined,
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updatePublicStatus(id: string, isPublic: boolean): Promise<void> {
    await this.db
      .prepare('UPDATE files SET is_public = ?, updated_at = ? WHERE id = ?')
      .bind(isPublic ? 1 : 0, Date.now(), id)
      .run();
  }

  async delete(id: string): Promise<void> {
    // 1. 删除可安全对象 (SQLite 外键自动级联删除 files, grants, file_tags)
    await this.db
      .prepare('DELETE FROM securable_objects WHERE id = ?')
      .bind(id)
      .run();

    // 2. 彻底清理孤儿标签：任何不再被任何文档关联的标签随之物理删除
    await this.db
      .prepare('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM file_tags)')
      .run();

    // 3. 重新校准剩余存量标签的真实引用计数
    await this.db
      .prepare('UPDATE tags SET usage_count = (SELECT COUNT(*) FROM file_tags WHERE file_tags.tag_id = tags.id)')
      .run();
  }
}
