import { describe, it, expect, beforeEach } from 'vitest';
import { AiChatService, ChatMessage } from '../src/services/ai-chat-service';
import { DocumentService } from '../src/services/document-service';
import { RbacService } from '../src/services/rbac-service';

class MockD1Database {
  private tables: Record<string, any[]> = {
    files: [],
    file_contents: [],
    tags: [],
    file_tags: [],
    roles: [{ id: 'rol_accountadmin', name: 'ACCOUNTADMIN' }],
  };

  prepare(query: string) {
    const tables = this.tables;
    return {
      bind: (...args: any[]) => ({
        first: async <T>(): Promise<T | null> => {
          if (query.includes('FROM tags WHERE name = ?')) {
            const row = tables.tags.find((t) => t.name === args[0]);
            return (row as T) || null;
          }
          if (query.includes('FROM files WHERE id = ?')) {
            const row = tables.files.find((f) => f.id === args[0]);
            return (row as T) || null;
          }
          return null;
        },
        all: async <T>(): Promise<{ results: T[] }> => {
          if (query.includes('FROM tags')) {
            return { results: tables.tags as T[] };
          }
          return { results: [] };
        },
        run: async () => {
          if (query.includes('INSERT INTO files')) {
            tables.files.push({
              id: args[0],
              name: args[1],
              title: args[2],
              size: args[3],
              r2_key: args[4],
              sha256: args[5],
              is_public: args[6],
              owner_role_id: args[7],
              creator_user_id: args[8],
              ai_summary: args[9],
              created_at: args[10],
              updated_at: args[11],
            });
          }
          if (query.includes('INSERT INTO file_contents')) {
            tables.file_contents.push({
              file_id: args[0],
              content: args[1],
              raw_data: args[2],
              updated_at: args[3],
            });
          }
          if (query.includes('INSERT INTO tags')) {
            tables.tags.push({ id: args[0], name: args[1], usage_count: args[2] });
          }
          return { success: true };
        },
      }),
    };
  }
}

describe('AI Chat & Distillation Service', () => {
  let db: any;
  let documentService: DocumentService;

  beforeEach(() => {
    db = new MockD1Database();
    const rbacService = new RbacService(db);
    documentService = new DocumentService(db, undefined, undefined, rbacService);
  });

  it('should support chat conversation and provide inspirational feedback', async () => {
    const aiChat = new AiChatService();
    const messages: ChatMessage[] = [
      { role: 'user', content: '我正在设计一个基于 Cloudflare 的个人微服务网盘，你觉得有什么亮点？' },
    ];

    const reply = await aiChat.chat(messages);
    expect(reply).toBeDefined();
    expect(reply.length).toBeGreaterThan(10);
    expect(reply).toContain('灵感');
  });

  it('should distill chat history into structured Markdown note', async () => {
    const aiChat = new AiChatService();
    const messages: ChatMessage[] = [
      { role: 'user', content: '我想用 SQLite D1 存元数据，直接存二进制做个人网盘' },
      { role: 'assistant', content: '这是个极简实用的做法，免去搭建多套系统的复杂度！' },
      { role: 'user', content: '然后再给它加个暗门，只有我自己双击 Logo 才能登录' },
    ];

    const { title, markdown } = await aiChat.distillToMarkdown(messages);
    expect(title).toBeDefined();
    expect(markdown).toContain('# ');
    expect(markdown).toContain('灵感速览');
    expect(markdown).toContain('方案剖析与关键论点');
    expect(markdown).toContain('后续行动项与落地建议');
  });

  it('should directly save distilled note into personal drive with tags and raw data', async () => {
    const title = '边缘架构下的灵感记录';
    const markdown = `# 边缘架构下的灵感记录\n\n> 💡 核心论点\n\n## 一、关键决策\n- 采用 D1 存储\n- 极简暗门登录`;

    const saved = await documentService.saveMarkdownNote(title, markdown, 'rol_accountadmin', 'usr_master', false);
    expect(saved).toBeDefined();
    expect(saved.id).toMatch(/^file_/);
    expect(saved.title).toBe(title);
    expect(saved.name).toBe('边缘架构下的灵感记录.md');
    expect(saved.isPublic).toBe(false);
  });
});
