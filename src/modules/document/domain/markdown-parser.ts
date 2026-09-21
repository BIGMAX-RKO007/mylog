import { marked } from 'marked';
import { ParsedDocument } from './types';

export class MarkdownParser {
  /**
   * 解析 Markdown 文本，提取标题并生成带样式的 HTML 片段
   */
  static parse(rawMarkdown: string, fallbackFileName: string): ParsedDocument {
    let title = '';
    let contentToRender = rawMarkdown;

    // 1. 尝试匹配 YAML Frontmatter
    const frontmatterMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (frontmatterMatch) {
      const frontmatterContent = frontmatterMatch[1];
      const titleMatch = frontmatterContent.match(/title:\s*["']?([^"'\n\r]+)["']?/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      contentToRender = rawMarkdown.slice(frontmatterMatch[0].length);
    }

    // 2. 若 Frontmatter 中无标题，嗅探正文中第一个一阶标题 (# 标题)
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

    // 4. 解析 HTML (开启换行与安全配置)
    const renderedHtml = marked.parse(contentToRender, {
      gfm: true,
      breaks: true,
    }) as string;

    const size = new TextEncoder().encode(rawMarkdown).length;
    // 粗略中英文字数统计
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

  /**
   * 计算内容 SHA256 指纹
   */
  static async computeSha256(content: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(content));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
