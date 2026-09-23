import { describe, it, expect } from 'vitest';
import { DocumentService } from '../src/services/document-service';

describe('DocumentService (双轨制元数据提取)', () => {
  const docService = new DocumentService({} as any);

  it('应准确提取标准 YAML Frontmatter 中的 tags 与 summary', async () => {
    const markdown = `---
title: Cloudflare D1 权限排坑指南
tags: [Cloudflare, D1, 数据库, 排坑]
summary: 解决 D1 在本地与生产环境因外键约束顺序导致的迁移死锁问题
verified: true
---

# 详细正文内容
今天排查了一个 D1 迁移死锁的重大问题...
`;

    const result = await docService.extractMetadata(markdown);
    expect(result.title).toBe('Cloudflare D1 权限排坑指南');
    expect(result.tags).toEqual(['Cloudflare', 'D1', '数据库', '排坑']);
    expect(result.summary).toBe('解决 D1 在本地与生产环境因外键约束顺序导致的迁移死锁问题');
  });

  it('没有 Frontmatter 时应智能从标题和内容中启发式提取关键标签', async () => {
    const rawMarkdown1 = `# 构建基于 HTMX 与 Markdown 的个人 AI 知识库与 Agent
在 AI 时代，.md 文件凭借其独特的优势，成为了连接人类与大模型之间的通用语。`;

    const result1 = await docService.extractMetadata(rawMarkdown1);
    expect(result1.tags).toContain('HTMX');
    expect(result1.tags).toContain('Markdown');

    const rawMarkdown2 = `# Zero与AI Agent编程语言综述
Zero 是 Vercel Labs 于 2026 年发布的实验性系统级编程语言...`;

    const result2 = await docService.extractMetadata(rawMarkdown2);
    expect(result2.tags).toContain('Zero');
    expect(result2.tags).toContain('Agent');
  });
});

describe('DocumentService (标签规范化与收敛漏斗)', () => {
  const docService = new DocumentService({} as any);

  it('词法规范化应小写化并去除特殊字符', () => {
    expect(DocumentService.cleanLexicalTag('  #SQL_Server  ')).toBe('sql-server');
    expect(DocumentService.cleanLexicalTag('Cloudflare Workers')).toBe('cloudflare-workers');
    expect(DocumentService.cleanLexicalTag('Python_3')).toBe('python-3');
  });

  it('同义词映射应自动收敛至权威标准标签', async () => {
    const res1 = await docService.normalizeTag('db');
    expect(res1).toBe('数据库');

    const res2 = await docService.normalizeTag('k8s');
    expect(res2).toBe('k8s');

    const res3 = await docService.normalizeTag('kubernetes');
    expect(res3).toBe('k8s');

    const res4 = await docService.normalizeTag('cf');
    expect(res4).toBe('cloudflare');
  });
});
