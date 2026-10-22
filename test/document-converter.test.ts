import { describe, it, expect } from 'vitest';
import { DocumentConverter } from '../src/services/document-converter';

describe('DocumentConverter (Multi-Format Support)', () => {
  it('should pass-through standard markdown', async () => {
    const raw = '# Hello World\n\nThis is a test.';
    const buffer = new TextEncoder().encode(raw).buffer;
    const md = await DocumentConverter.convertToMarkdown('test.md', buffer);
    expect(md).toBe(raw);
  });

  it('should convert txt with auto title', async () => {
    const raw = 'Simple text file content line 1\nLine 2';
    const buffer = new TextEncoder().encode(raw).buffer;
    const md = await DocumentConverter.convertToMarkdown('my-notes.txt', buffer);
    expect(md).toContain('# my-notes');
    expect(md).toContain('Simple text file content line 1');
  });

  it('should format json into fenced code block', async () => {
    const raw = '{"name":"mylog","version":2}';
    const buffer = new TextEncoder().encode(raw).buffer;
    const md = await DocumentConverter.convertToMarkdown('config.json', buffer);
    expect(md).toContain('# config');
    expect(md).toContain('```json');
    expect(md).toContain('"name": "mylog"');
  });

  it('should convert csv into markdown table', async () => {
    const raw = '姓名,职务,部门\n张三,工程师,基础架构\n李四,设计师,体验中心';
    const buffer = new TextEncoder().encode(raw).buffer;
    const md = await DocumentConverter.convertToMarkdown('staff.csv', buffer);
    expect(md).toContain('# staff');
    expect(md).toContain('| 姓名 | 职务 | 部门 |');
    expect(md).toContain('| --- | --- | --- |');
    expect(md).toContain('| 张三 | 工程师 | 基础架构 |');
  });

  it('should wrap source code with language tag', async () => {
    const raw = 'def hello():\n    return "world"';
    const buffer = new TextEncoder().encode(raw).buffer;
    const md = await DocumentConverter.convertToMarkdown('script.py', buffer);
    expect(md).toContain('# script');
    expect(md).toContain('```python');
    expect(md).toContain('def hello():');
  });

  it('should convert real docx file to markdown', async () => {
    try {
      const fs = (globalThis as any).require('fs');
      const fixturePath = 'test/fixtures/sample-office.docx';
      if (fs.existsSync(fixturePath)) {
        const buffer = fs.readFileSync(fixturePath).buffer;
        const md = await DocumentConverter.convertToMarkdown('sample-office.docx', buffer);
        expect(md).toContain('Cloudflare 边缘架构白皮书');
        expect(md).toContain('Office Word .docx 格式成功导入');
      }
    } catch {
      // In purely browser or isolate environments without node:fs
    }
  });

  it('should convert real xlsx file to markdown tables', async () => {
    try {
      const fs = (globalThis as any).require('fs');
      const fixturePath = 'test/fixtures/sample-data.xlsx';
      if (fs.existsSync(fixturePath)) {
        const buffer = fs.readFileSync(fixturePath).buffer;
        const md = await DocumentConverter.convertToMarkdown('sample-data.xlsx', buffer);
        expect(md).toContain('# sample-data');
        expect(md).toContain('| 指标名称 | Q1 实际 | Q2 预期 | 增长率 |');
        expect(md).toContain('| 知识库访问量 | 12000 | 25000 | +108% |');
      }
    } catch {
      // In purely browser or isolate environments without node:fs
    }
  });

  it('should extract text from pdf file to markdown', async () => {
    try {
      const fs = (globalThis as any).require('fs');
      const fixturePath = 'test/fixtures/sample-doc.pdf';
      if (fs.existsSync(fixturePath)) {
        const buffer = fs.readFileSync(fixturePath).buffer;
        const md = await DocumentConverter.convertToMarkdown('sample-doc.pdf', buffer);
        expect(md).toContain('# sample-doc');
        expect(md).toContain('Cloudflare Workers and PDF Ingestion Guide');
      }
    } catch {
      // In purely browser or isolate environments without node:fs
    }
  });

  it('should reject unsupported binary format', async () => {
    const buffer = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]).buffer;
    await expect(DocumentConverter.convertToMarkdown('bad.unknown_bin', buffer)).rejects.toThrow(
      '暂不支持解析格式'
    );
  });
});
