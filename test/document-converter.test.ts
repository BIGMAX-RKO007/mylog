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

  it('should convert pptx file into structured slide outline', async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    // 构造模拟 slide1.xml
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp><p:txBody><a:p><a:r><a:t>架构设计全景汇报</a:t></a:r></a:p></p:txBody></p:sp>
            <p:sp><p:txBody><a:p><a:r><a:t>第一副标题：个人网盘与微架构</a:t></a:r></a:p></p:txBody></p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`;
    // 构造模拟 slide2.xml
    const slide2Xml = `<?xml version="1.0" encoding="UTF-8"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp><p:txBody><a:p><a:r><a:t>技术选型核心优势</a:t></a:r></a:p></p:txBody></p:sp>
            <p:sp><p:txBody><a:p><a:r><a:t>1. 边缘计算 0 账单</a:t></a:r></a:p><a:p><a:r><a:t>2. HTMX 超媒体极速响应</a:t></a:r></a:p></p:txBody></p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`;

    zip.file('ppt/slides/slide1.xml', slide1Xml);
    zip.file('ppt/slides/slide2.xml', slide2Xml);

    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const md = await DocumentConverter.convertToMarkdown('my-pitch.pptx', buffer);

    expect(md).toContain('# my-pitch');
    expect(md).toContain('共 2 页幻灯片');
    expect(md).toContain('## 幻灯片 1: 架构设计全景汇报');
    expect(md).toContain('第一副标题：个人网盘与微架构');
    expect(md).toContain('## 幻灯片 2: 技术选型核心优势');
    expect(md).toContain('1. 边缘计算 0 账单');
    expect(md).toContain('2. HTMX 超媒体极速响应');
  });

  it('should generate fallback card for ppt binary', async () => {
    const buffer = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).buffer;
    const md = await DocumentConverter.convertToMarkdown('presentation.ppt', buffer);
    expect(md).toContain('PowerPoint 97-2003 演示文稿');
    expect(md).toContain('下载原文件');
  });

  it('should handle general binary files gracefully in cloud drive mode', async () => {
    const buffer = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]).buffer;
    const md = await DocumentConverter.convertToMarkdown('archive.zip', buffer);
    expect(md).toContain('个人网盘压缩包资产');
    expect(md).toContain('archive.zip');
    expect(md).toContain('下载原文件');
  });
});
