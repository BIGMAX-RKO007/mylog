import { describe, it, expect } from 'vitest';
import { MetadataExtractor } from '../src/modules/document/domain/metadata-extractor';
import { TagNormalizer } from '../src/modules/document/domain/tag-normalizer';

describe('MetadataExtractor (双轨制元数据提取)', () => {
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

    const result = await MetadataExtractor.extract(markdown);
    expect(result.isFrontmatterParsed).toBe(true);
    expect(result.title).toBe('Cloudflare D1 权限排坑指南');
    expect(result.tags).toEqual(['Cloudflare', 'D1', '数据库', '排坑']);
    expect(result.summary).toBe('解决 D1 在本地与生产环境因外键约束顺序导致的迁移死锁问题');
  });

  it('没有 Frontmatter 时应智能从标题和内容中启发式提取关键标签', async () => {
    const rawMarkdown1 = `# 构建基于 HTMX 与 Markdown 的个人 AI 知识库与 Agent
在 AI 时代，.md 文件凭借其独特的优势，成为了连接人类与大模型之间的通用语。`;

    const result1 = await MetadataExtractor.extract(rawMarkdown1);
    expect(result1.isFrontmatterParsed).toBe(false);
    expect(result1.tags).toContain('HTMX');
    expect(result1.tags).toContain('Markdown');

    const rawMarkdown2 = `# Zero与AI Agent编程语言综述
Zero 是 Vercel Labs 于 2026 年发布的实验性系统级编程语言...`;

    const result2 = await MetadataExtractor.extract(rawMarkdown2);
    expect(result2.tags).toContain('Zero');
    expect(result2.tags).toContain('Agent');
  });

});

describe('TagNormalizer (标签规范化与收敛漏斗)', () => {
  it('词法规范化应小写化并去除特殊字符', () => {
    expect(TagNormalizer.cleanLexical('  #SQL_Server  ')).toBe('sql-server');
    expect(TagNormalizer.cleanLexical('Cloudflare Workers')).toBe('cloudflare-workers');
    expect(TagNormalizer.cleanLexical('Python_3')).toBe('python-3');
  });

  it('同义词映射应自动收敛至权威标准标签', async () => {
    const res1 = await TagNormalizer.normalize('db');
    expect(res1.normalizedName).toBe('数据库');
    expect(res1.isMerged).toBe(true);

    const res2 = await TagNormalizer.normalize('k8s');
    expect(res2.normalizedName).toBe('k8s');

    const res3 = await TagNormalizer.normalize('kubernetes');
    expect(res3.normalizedName).toBe('k8s');
    expect(res3.isMerged).toBe(true);

    const res4 = await TagNormalizer.normalize('cf');
    expect(res4.normalizedName).toBe('cloudflare');
  });
});
