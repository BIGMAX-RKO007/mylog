import { marked } from 'marked';
import { RbacService } from './rbac-service';

export interface DocumentMetadata {
  id: string;
  name: string;
  title: string;
  size: number;
  r2Key: string;
  sha256: string;
  isPublic: boolean;
  ownerRoleId: string;
  views: number;
  aiSummary?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ParsedDocument {
  title: string;
  renderedHtml: string;
  rawMarkdown: string;
  wordCount: number;
  size: number;
}

export interface PreviewResult {
  parsed: ParsedDocument;
  uploadToken: string;
  fileName: string;
}

export interface DocumentViewData {
  metadata: DocumentMetadata;
  parsed: ParsedDocument;
  isOwner: boolean;
}

export interface SmartSearchResult {
  files: DocumentMetadata[];
  expandedKeywords?: string[];
  matchedTag?: string;
}

export class DocumentService {
  // 常见主流技术/领域关键词识别库（用于无 AI 时的智能启发式提取）
  private static readonly TECH_KEYWORDS = [
    'HTMX', 'Markdown', 'AI', 'Agent', 'Zero', 'Cloudflare', 'D1', 'R2', 'Workers',
    'Docker', 'K8s', 'Kubernetes', 'Linux', 'Nginx', 'Rust', 'Go', 'Golang',
    'Python', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Next.js', 'Hono',
    'SQL', 'SQLite', 'PostgreSQL', 'MySQL', 'Redis', 'RBAC', '安全', '运维',
    '算法', '数学', '物理', '微积分', '情感', '心理', '系统设计', '排坑', '架构'
  ];

  // 基础常用权威别名快速字典 (0ms 查表)
  private static readonly SYNONYM_MAP: Record<string, string> = {
    db: '数据库',
    database: '数据库',
    sql: 'sql',
    k8s: 'k8s',
    kubernetes: 'k8s',
    cf: 'cloudflare',
    workers: 'cloudflare',
    'cloudflare-workers': 'cloudflare',
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    d1: 'd1',
    r2: 'r2',
    rbac: 'rbac',
  };

  constructor(
    private db: D1Database,
    private aiBinding?: any,
    private vectorizeBinding?: any,
    private rbacService?: RbacService
  ) {}

  // -------------------------------------------------------------
  // Markdown 文本解析与指纹计算
  // -------------------------------------------------------------

  static parseMarkdown(rawMarkdown: string, fallbackFileName: string): ParsedDocument {
    let title = '';
    let contentToRender = rawMarkdown;

    // 1. 尝试匹配 YAML Frontmatter 中的 title
    const frontmatterMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (frontmatterMatch) {
      const frontmatterContent = frontmatterMatch[1];
      const titleMatch = frontmatterContent.match(/title:\s*["']?([^"'\n\r]+)["']?/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      contentToRender = rawMarkdown.slice(frontmatterMatch[0].length);
    }

    // 2. 嗅探正文中第一个一阶标题 (# 标题)
    if (!title) {
      const h1Match = contentToRender.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }

    // 3. 兜底标题：采用不带 .md 扩展名的原文件名
    if (!title) {
      title = fallbackFileName.replace(/\.(md|markdown)$/i, '') || '未命名文档';
    }

    // 4. 解析 HTML (开启 GFM 与换行支持)
    const renderedHtml = marked.parse(contentToRender, {
      gfm: true,
      breaks: true,
    }) as string;

    const size = new TextEncoder().encode(rawMarkdown).length;
    const cleanText = rawMarkdown.replace(/[#*`~>-]/g, '').trim();
    const wordCount = cleanText.length;

    return {
      title,
      renderedHtml,
      rawMarkdown,
      wordCount,
      size,
    };
  }

  static async computeSha256(content: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(content));
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // -------------------------------------------------------------
  // 双轨元数据提取 (YAML Frontmatter + Workers AI + 启发式)
  // -------------------------------------------------------------

  static parseFrontmatter(markdown: string): { frontmatter: Record<string, any>; cleanBody: string } | null {
    if (!markdown) return null;
    const match = markdown.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) return null;

    const frontmatterRaw = match[1].trim();
    const cleanBody = markdown.slice(match[0].length).trim();
    const result: Record<string, any> = {};
    const lines = frontmatterRaw.split(/\r?\n/);

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();

      if (val.startsWith('[') && val.endsWith(']')) {
        const items = val
          .slice(1, -1)
          .split(/[,，]/)
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        result[key] = items;
      } else {
        val = val.replace(/^["']|["']$/g, '');
        result[key] = val;
      }
    }

    return { frontmatter: result, cleanBody };
  }

  static extractHeuristic(markdown: string): { tags: string[]; summary: string } {
    const lines = markdown.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';
    const contentSample = markdown.slice(0, 1500);

    // 1. 文档本质类型优先判定 (简历/求职/档案等)
    const isResume = /(?:简历|履历|求职|教育背景|工作经历|项目经验|resume|curriculum vitae)/i.test(firstLine + '\n' + contentSample);
    const matchedTags: string[] = [];
    if (isResume) {
      matchedTags.push('简历', '求职档案');
    }

    // 2. 扫描匹配知名技术/主题关键词
    if (matchedTags.length < 3) {
      for (const kw of this.TECH_KEYWORDS) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(contentSample) && !matchedTags.includes(kw)) {
          matchedTags.push(kw);
          if (matchedTags.length >= 3) break;
        }
      }
    }

    // 3. 兜底从第一行切词
    if (matchedTags.length === 0) {
      const cleanTitle = firstLine.replace(/^[#\s\-_*]+/, '').trim();
      const chunks = cleanTitle.split(/[\s,，、—\-_/]+/).filter((s) => s.length >= 2 && s.length <= 8);
      if (chunks.length > 0) {
        matchedTags.push(...chunks.slice(0, 2));
      } else {
        matchedTags.push('知识经验');
      }
    }

    // 4. 抽取一句话核心摘要
    const bodyLines = lines.filter((l) => !l.startsWith('#')).slice(0, 3);
    let summary = bodyLines.join(' ').replace(/[#*`_~>]/g, '').trim();
    if (!summary || summary.length < 10) {
      summary = lines.slice(0, 2).join(' ').replace(/[#*`_~>]/g, '').trim();
    }

    return {
      tags: matchedTags.slice(0, 3),
      summary: summary.slice(0, 80) || '暂无详细摘要',
    };
  }

  async extractMetadata(markdown: string): Promise<{ title?: string; tags: string[]; summary?: string }> {
    // 1. 快车道 (YAML Frontmatter)
    const parsedFm = DocumentService.parseFrontmatter(markdown);
    if (parsedFm && (parsedFm.frontmatter.tags || parsedFm.frontmatter.summary)) {
      let rawTags: string[] = [];
      if (Array.isArray(parsedFm.frontmatter.tags)) {
        rawTags = parsedFm.frontmatter.tags;
      } else if (typeof parsedFm.frontmatter.tags === 'string') {
        rawTags = parsedFm.frontmatter.tags.split(/[,，]/).map((s) => s.trim());
      }

      return {
        title: parsedFm.frontmatter.title,
        tags: rawTags.filter(Boolean).slice(0, 4),
        summary: parsedFm.frontmatter.summary,
      };
    }

    // 2. 辅道 (Workers AI 结构化提炼)
    if (this.aiBinding && typeof this.aiBinding.run === 'function') {
      try {
        const preview = markdown.slice(0, 1500);
        const prompt = `你是一个专业技术知识库管理员。请仔细阅读以下文档，提炼 1~3 个最能代表文档核心本质或主题的标签（例如若为简历则提炼"简历","求职档案"；若为系统设计则提炼"系统设计","架构"等，切忌盲目罗列正文中提到的编程语言名称），并撰写一句话（30-50字）的核心内容摘要。
必须严格只返回 JSON 格式，不要包含任何 markdown 标记或额外废话：
{"tags": ["主题标签1", "主题标签2"], "summary": "30-50字的核心内容摘要"}

文档内容：
${preview}`;

        const aiResponse = await this.aiBinding.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        }).catch(() => {
          return this.aiBinding.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          });
        });

        // 兼容 Cloudflare Workers AI 自动解析为 JavaScript 对象的场景
        const resp = aiResponse?.response ?? aiResponse;
        if (resp && typeof resp === 'object') {
          if (Array.isArray(resp.tags) && resp.tags.length > 0) {
            return {
              tags: resp.tags.slice(0, 3).map((t: any) => String(t).trim()),
              summary: typeof resp.summary === 'string' ? resp.summary.trim() : undefined,
            };
          }
        }

        const rawText = typeof resp === 'string' ? resp : JSON.stringify(resp || '');
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
            return {
              tags: parsed.tags.slice(0, 3).map((t: any) => String(t).trim()),
              summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined,
            };
          }
        }
      } catch (err) {
        console.warn('Workers AI extraction fallback to heuristic:', err);
      }
    }

    // 3. 动态启发式关键词提取兜底
    const heuristic = DocumentService.extractHeuristic(markdown);
    return {
      tags: heuristic.tags,
      summary: heuristic.summary,
    };
  }

  // -------------------------------------------------------------
  // 四步标签防膨胀收敛 (Lexical ➔ Dict ➔ Exact ➔ Vectorize 0.85)
  // -------------------------------------------------------------

  static cleanLexicalTag(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '')
      .slice(0, 30);
  }

  async normalizeTag(rawTag: string, existingTags: string[] = []): Promise<string> {
    const cleaned = DocumentService.cleanLexicalTag(rawTag);
    if (!cleaned) return '通用';

    // 1. 字典映射
    if (DocumentService.SYNONYM_MAP[cleaned]) {
      return DocumentService.SYNONYM_MAP[cleaned];
    }

    // 2. 检查现有标签是否已有完全相同（忽略大小写）
    const matched = existingTags.find((t) => t.toLowerCase() === cleaned.toLowerCase());
    if (matched) return matched;

    // 3. Vectorize 向量聚类比对
    if (this.vectorizeBinding && this.aiBinding && typeof this.aiBinding.run === 'function') {
      try {
        const embedRes = await this.aiBinding.run('@cf/baai/bge-base-en-v1.5', { text: [cleaned] });
        const vector = embedRes?.data?.[0];

        if (Array.isArray(vector) && vector.length > 0) {
          const queryRes = await this.vectorizeBinding.query(vector, { topK: 1 });
          const topMatch = queryRes?.matches?.[0];

          // 相似度阈值 >= 0.85 自动判定合并，收敛标签集
          if (topMatch && topMatch.score >= 0.85 && topMatch.id) {
            return topMatch.id;
          }

          // 若无高相似度，将新标签向量存入 Vectorize
          await this.vectorizeBinding.upsert([
            { id: cleaned, values: vector, namespace: 'tags' },
          ]);
        }
      } catch (err) {
        console.warn('Vectorize tag normalization skipped:', err);
      }
    }

    return cleaned;
  }

  // -------------------------------------------------------------
  // 文档上传暂存与提交入库
  // -------------------------------------------------------------

  async previewUpload(fileName: string, rawMarkdown: string): Promise<PreviewResult> {
    if (!rawMarkdown || !rawMarkdown.trim()) {
      throw new Error('上传的 Markdown 文件内容为空');
    }

    const parsed = DocumentService.parseMarkdown(rawMarkdown, fileName);
    const sha256 = await DocumentService.computeSha256(rawMarkdown);

    const payload = {
      name: fileName,
      title: parsed.title,
      rawMarkdown,
      sha256,
      size: parsed.size,
      exp: Date.now() + 1000 * 60 * 15, // 15 分钟有效
    };

    const uploadToken = btoa(encodeURIComponent(JSON.stringify(payload)));

    return {
      parsed,
      uploadToken,
      fileName,
    };
  }

  static unpackUploadToken(uploadToken: string): {
    name: string;
    title: string;
    rawMarkdown: string;
    sha256: string;
    size: number;
  } {
    try {
      const jsonStr = decodeURIComponent(atob(uploadToken));
      const payload = JSON.parse(jsonStr);
      if (Date.now() > payload.exp) {
        throw new Error('预览已过期，请重新上传文件');
      }
      return payload;
    } catch (e: any) {
      throw new Error(e.message || '无效的上传令牌');
    }
  }

  async commitDocument(
    uploadToken: string,
    ownerRoleId: string,
    creatorUserId: string,
    isPublic: boolean = false
  ): Promise<DocumentMetadata> {
    const { name, title: initialTitle, rawMarkdown, sha256, size } = DocumentService.unpackUploadToken(uploadToken);
    const fileId = `file_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const r2Key = `files/${ownerRoleId}/${fileId}.md`;
    const now = Date.now();

    // 1. 双轨元数据提取
    const extracted = await this.extractMetadata(rawMarkdown);
    const finalTitle = extracted.title && extracted.title.trim() ? extracted.title.trim() : initialTitle;

    // 2. 标签规范化与收敛
    const existingTags = (await this.listPopularTags(50)).map((t) => t.name);
    const normalizedTags: string[] = [];
    for (const rawTag of extracted.tags) {
      const norm = await this.normalizeTag(rawTag, existingTags);
      if (norm && !normalizedTags.includes(norm)) {
        normalizedTags.push(norm);
      }
    }

    // 3. 存储正文至 file_contents (免信用卡 D1 存储适配器)
    await this.db
      .prepare(`
        INSERT INTO file_contents (key, content, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
      `)
      .bind(r2Key, rawMarkdown, now)
      .run();

    // 4. 创建 securable_objects 记录
    await this.db
      .prepare('INSERT INTO securable_objects (id, object_type, owner_role_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(fileId, 'FILE', ownerRoleId, now)
      .run();

    // 5. 创建 files 元数据记录
    await this.db
      .prepare(`
        INSERT INTO files (id, name, title, size, r2_key, sha256, is_public, category_id, views, ai_summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'cat_uncategorized', 0, ?, ?, ?)
      `)
      .bind(fileId, name, finalTitle, size, r2Key, sha256, isPublic ? 1 : 0, extracted.summary || null, now, now)
      .run();

    // 6. 为所有者角色赋予 OWNERSHIP 特权
    const grantId = `grt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.db
      .prepare('INSERT INTO grants (id, role_id, object_id, privilege, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(grantId, ownerRoleId, fileId, 'OWNERSHIP', creatorUserId, now)
      .run();

    // 7. 绑定标签 (更新 tags 字典与 file_tags 关联)
    for (const tagName of normalizedTags) {
      let tag = await this.db.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first<{ id: string }>();
      let tagId: string;
      if (!tag) {
        tagId = `tag_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
        await this.db.prepare('INSERT INTO tags (id, name, usage_count, created_at) VALUES (?, ?, 1, ?)').bind(tagId, tagName, now).run();
      } else {
        tagId = tag.id;
        await this.db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').bind(tagId).run();
      }
      await this.db.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id, created_at) VALUES (?, ?, ?)').bind(fileId, tagId, now).run();
    }

    return {
      id: fileId,
      name,
      title: finalTitle,
      size,
      r2Key,
      sha256,
      isPublic,
      ownerRoleId,
      views: 0,
      aiSummary: extracted.summary,
      tags: normalizedTags,
      createdAt: now,
      updatedAt: now,
    };
  }

  // -------------------------------------------------------------
  // 文档阅读与内容拉取
  // -------------------------------------------------------------

  async getDocumentForView(fileId: string, userId?: string): Promise<DocumentViewData> {
    const meta = await this.findById(fileId);
    if (!meta) {
      throw new Error('文档不存在或已被删除');
    }

    // 鉴权
    if (this.rbacService) {
      const canRead = await this.rbacService.hasPrivilege(userId, fileId, 'READ');
      if (!canRead) {
        throw new Error('您没有权限查看该文档 (403 Forbidden)');
      }
    }

    // 自增阅读量
    await this.db.prepare('UPDATE files SET views = views + 1 WHERE id = ?').bind(fileId).run();
    meta.views = (meta.views || 0) + 1;

    // 拉取物理内容
    const contentRow = await this.db.prepare('SELECT content FROM file_contents WHERE key = ?').bind(meta.r2Key).first<{ content: string }>();
    if (!contentRow || contentRow.content === null) {
      throw new Error('未在存储中找到文件内容');
    }

    const parsed = DocumentService.parseMarkdown(contentRow.content, meta.name);
    const isOwner = this.rbacService && userId ? await this.rbacService.hasPrivilege(userId, fileId, 'DELETE') : false;

    return {
      metadata: meta,
      parsed,
      isOwner,
    };
  }

  async getRawContent(fileId: string, userId?: string): Promise<{ name: string; content: string }> {
    const meta = await this.findById(fileId);
    if (!meta) throw new Error('文件不存在');

    if (this.rbacService) {
      const canRead = await this.rbacService.hasPrivilege(userId, fileId, 'READ');
      if (!canRead) throw new Error('无权下载该文件 (403 Forbidden)');
    }

    const row = await this.db.prepare('SELECT content FROM file_contents WHERE key = ?').bind(meta.r2Key).first<{ content: string }>();
    if (!row || row.content === null) throw new Error('文件内容缺失');

    return {
      name: meta.name,
      content: row.content,
    };
  }

  // -------------------------------------------------------------
  // 文档删除与孤儿标签级联清理
  // -------------------------------------------------------------

  async deleteDocument(fileId: string, userId: string): Promise<void> {
    if (this.rbacService) {
      const canDelete = await this.rbacService.hasPrivilege(userId, fileId, 'DELETE');
      if (!canDelete) {
        throw new Error('无权删除该文档：仅文档所有者或管理员可执行删除操作');
      }
    }

    const doc = await this.findById(fileId);
    if (!doc) {
      throw new Error('文档不存在或已被删除');
    }

    // 1. 删除 file_contents 内容
    await this.db.prepare('DELETE FROM file_contents WHERE key = ?').bind(doc.r2Key).run();

    // 2. 删除 securable_objects (级联清除 files, grants, file_tags)
    await this.db.prepare('DELETE FROM securable_objects WHERE id = ?').bind(fileId).run();

    // 3. 彻底清理孤儿标签 (任何不再被任何文档引用的标签即刻从 tags 表物理清除)
    await this.db.prepare('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM file_tags)').run();

    // 4. 重新校准剩余存量标签的真实引用计数
    await this.db.prepare('UPDATE tags SET usage_count = (SELECT COUNT(*) FROM file_tags WHERE file_tags.tag_id = tags.id)').run();
  }

  async updatePublicStatus(fileId: string, isPublic: boolean, userId: string): Promise<void> {
    if (this.rbacService) {
      const isOwner = await this.rbacService.hasPrivilege(userId, fileId, 'OWNERSHIP');
      if (!isOwner) throw new Error('只有所有者有权调整分享权限');
    }

    await this.db
      .prepare('UPDATE files SET is_public = ?, updated_at = ? WHERE id = ?')
      .bind(isPublic ? 1 : 0, Date.now(), fileId)
      .run();
  }

  // -------------------------------------------------------------
  // 文档列表与检索查询
  // -------------------------------------------------------------

  async findById(fileId: string): Promise<DocumentMetadata | null> {
    const row = await this.db
      .prepare(`
        SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
               f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
               (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
        FROM files f
        JOIN securable_objects so ON f.id = so.id
        WHERE f.id = ?
      `)
      .bind(fileId)
      .first<{
        id: string;
        name: string;
        title: string;
        size: number;
        r2_key: string;
        sha256: string;
        is_public: number;
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
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listPopularTags(limit: number = 20): Promise<{ name: string; count: number }[]> {
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

  async listAccessible(userId: string, search?: string, tag?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]> {
    let query = `
      WITH RECURSIVE user_effective_roles AS (
        SELECT role_id FROM user_roles WHERE user_id = ?
        UNION
        SELECT ri.child_role_id
        FROM role_inheritance ri
        JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
      )
      SELECT DISTINCT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
             (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
      FROM files f
      JOIN securable_objects so ON f.id = so.id
      LEFT JOIN grants g ON g.object_id = f.id
      WHERE (
        (g.role_id IN (SELECT role_id FROM user_effective_roles) AND g.privilege IN ('READ', 'OWNERSHIP'))
        OR f.is_public = 1
        OR 'rol_accountadmin' IN (SELECT role_id FROM user_effective_roles)
        OR 'rol_admin' IN (SELECT role_id FROM user_effective_roles)
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
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listPublic(search?: string, tag?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]> {
    let query = `
      SELECT f.id, f.name, f.title, f.size, f.r2_key, f.sha256, f.is_public,
             f.views, f.ai_summary, so.owner_role_id, f.created_at, f.updated_at,
             (SELECT GROUP_CONCAT(t.name) FROM file_tags ft JOIN tags t ON ft.tag_id = t.id WHERE ft.file_id = f.id) as tag_names
      FROM files f
      JOIN securable_objects so ON f.id = so.id
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
      views: row.views || 0,
      aiSummary: row.ai_summary || undefined,
      tags: row.tag_names ? row.tag_names.split(',').filter(Boolean) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // -------------------------------------------------------------
  // 智能混合搜索 (AI 意图扩词 + SQL 模糊匹配)
  // -------------------------------------------------------------

  async search(
    query?: string,
    userId?: string,
    tag?: string,
    sort?: 'latest' | 'views'
  ): Promise<SmartSearchResult> {
    const trimmedQuery = query?.trim() || '';

    // 1. 指定标签过滤：直接查库
    if (tag && tag.trim()) {
      const files = userId
        ? await this.listAccessible(userId, trimmedQuery, tag.trim(), sort)
        : await this.listPublic(trimmedQuery, tag.trim(), sort);
      return { files, matchedTag: tag.trim() };
    }

    // 2. 未输入关键词：查全量
    if (!trimmedQuery) {
      const files = userId
        ? await this.listAccessible(userId, undefined, undefined, sort)
        : await this.listPublic(undefined, undefined, sort);
      return { files };
    }

    // 3. 先走精准字面检索
    const initialFiles = userId
      ? await this.listAccessible(userId, trimmedQuery, undefined, sort)
      : await this.listPublic(trimmedQuery, undefined, sort);

    if (!this.aiBinding || typeof this.aiBinding.run !== 'function') {
      return { files: initialFiles };
    }

    // 4. AI 智能意图扩展词
    let expandedWords: string[] = [];
    try {
      const prompt = `你是一个技术搜索意图分析引擎。用户搜索了: "${trimmedQuery}"。
请推断其真实意图，给出 2 到 4 个最相关的技术同义词、缩写或关联词。
必须只返回逗号分隔的词语列表，不要输出任何其他文字或标点：
例如输入 sql，输出：数据库,db,database,sqlite`;

      const aiRes = await this.aiBinding.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
      }).catch(() => {
        return this.aiBinding.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
        });
      });

      const raw = aiRes?.response || '';
      expandedWords = raw
        .split(/[,，\n]/)
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s: string) => s.length > 0 && s.toLowerCase() !== trimmedQuery.toLowerCase())
        .slice(0, 4);
    } catch (err) {
      console.warn('Smart search query expansion skipped:', err);
    }

    if (expandedWords.length === 0) {
      return { files: initialFiles };
    }

    // 5. 聚合多路召回结果
    const fileMap = new Map<string, DocumentMetadata>();
    for (const f of initialFiles) {
      fileMap.set(f.id, f);
    }

    for (const word of expandedWords) {
      const moreFiles = userId
        ? await this.listAccessible(userId, word, undefined, sort)
        : await this.listPublic(word, undefined, sort);

      for (const f of moreFiles) {
        if (!fileMap.has(f.id)) {
          fileMap.set(f.id, f);
        }
      }
    }

    return {
      files: Array.from(fileMap.values()),
      expandedKeywords: expandedWords,
    };
  }
}
