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
        .prepare('INSERT INTO files (id, name, title, size, r2_key, sha256, is_public, category_id, views, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(doc.id, doc.name, doc.title, doc.size, doc.r2Key, doc.sha256, doc.isPublic ? 1 : 0, categoryId, doc.views || 0, doc.createdAt, doc.updatedAt),
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
               f.views, so.owner_role_id, f.created_at, f.updated_at
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
        owner_role_id: string;
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

  async listAccessible(userId: string, search?: string, categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]> {
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
             f.views, so.owner_role_id, f.created_at, f.updated_at
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
      query += ` AND (f.title LIKE ? OR f.name LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
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
      owner_role_id: string;
      created_at: number;
      updated_at: number;
    }>();

    return results.map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listPublic(search?: string, categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]> {
    let query = `
      SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.category_id, c.name as category_name, pc.name as parent_category_name,
             f.views, so.owner_role_id, f.created_at, f.updated_at
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE f.is_public = 1
    `;

    const params: unknown[] = [];

    if (search && search.trim()) {
      query += ` AND (f.title LIKE ? OR f.name LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
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
      owner_role_id: string;
      created_at: number;
      updated_at: number;
    }>();

    return results.map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listAll(categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]> {
    let query = `
      SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.category_id, c.name as category_name, pc.name as parent_category_name,
             f.views, so.owner_role_id, f.created_at, f.updated_at
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
    `;

    const params: unknown[] = [];

    if (categoryId && categoryId.trim()) {
      query += ` WHERE (f.category_id = ? OR f.category_id IN (SELECT id FROM categories WHERE parent_id = ?))`;
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
      owner_role_id: string;
      created_at: number;
      updated_at: number;
    }>();

    return results.map(row => ({
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
    // 外键级联删除 files, grants
    await this.db
      .prepare('DELETE FROM securable_objects WHERE id = ?')
      .bind(id)
      .run();
  }
}
