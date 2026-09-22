export interface ExtractedMetadata {
  title?: string;
  tags: string[];
  summary?: string;
  isFrontmatterParsed: boolean;
}

export class MetadataExtractor {
  /**
   * 极速解析 Markdown YAML Frontmatter (0 Token, 0 延迟)
   */
  static parseFrontmatter(markdown: string): { frontmatter: Record<string, any>; cleanBody: string } | null {
    if (!markdown.startsWith('---')) {
      return null;
    }

    const endIdx = markdown.indexOf('\n---', 3);
    if (endIdx === -1) {
      return null;
    }

    const frontmatterRaw = markdown.slice(3, endIdx).trim();
    const cleanBody = markdown.slice(endIdx + 4).trim();

    const result: Record<string, any> = {};
    const lines = frontmatterRaw.split('\n');

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();

      // 处理数组格式: [a, b, c] 或 "a, b"
      if (val.startsWith('[') && val.endsWith(']')) {
        const items = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        result[key] = items;
      } else {
        // 去除外层引号
        val = val.replace(/^["']|["']$/g, '');
        result[key] = val;
      }
    }

    return { frontmatter: result, cleanBody };
  }

  /**
   * 双轨制元数据提取：
   * 1. 优先快车道：解析 YAML Frontmatter
   * 2. 辅道兜底：调用 Workers AI (Llama 3.1) 结构化提取
   */
  static async extract(
    markdown: string,
    aiBinding?: any
  ): Promise<ExtractedMetadata> {
    // 1. 快车道 (Fast Track)
    const parsedFm = this.parseFrontmatter(markdown);
    if (parsedFm && (parsedFm.frontmatter.tags || parsedFm.frontmatter.summary)) {
      let rawTags: string[] = [];
      if (Array.isArray(parsedFm.frontmatter.tags)) {
        rawTags = parsedFm.frontmatter.tags;
      } else if (typeof parsedFm.frontmatter.tags === 'string') {
        rawTags = parsedFm.frontmatter.tags.split(',').map((s) => s.trim());
      }

      return {
        title: parsedFm.frontmatter.title,
        tags: rawTags.filter(Boolean).slice(0, 4),
        summary: parsedFm.frontmatter.summary,
        isFrontmatterParsed: true,
      };
    }

    // 2. 辅道兜底 (Workers AI Fallback)
    if (aiBinding && typeof aiBinding.run === 'function') {
      try {
        const preview = markdown.slice(0, 1500);
        const prompt = `你是一个专业知识库管理员。请分析以下技术笔记，提取 1~3 个核心技术/领域标签，并用一句话概括其核心结论或解决的问题。
必须严格只返回 JSON 格式，不要包含任何 markdown 代码块标记或额外废话：
{"tags": ["标签1", "标签2"], "summary": "30-50字的核心摘要"}

笔记内容：
${preview}`;

        const aiResponse = await aiBinding.run('@cf/qwen/qwen1.5-7b-chat', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        }).catch(() => {
          return aiBinding.run('@cf/meta/llama-3-8b-instruct', {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          });
        });


        const rawText: string = aiResponse?.response || '';
        // 提取 JSON
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
            summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined,
            isFrontmatterParsed: false,
          };
        }
      } catch (err) {
        console.warn('Workers AI extraction fallback error:', err);
      }
    }

    // 3. 极速纯文本启发式兜底 (若未配置 AI 或 AI 超时)
    const firstLines = markdown.split('\n').filter((l) => l.trim().length > 0);
    const summary = firstLines.slice(1, 3).join(' ').replace(/[#*`_]/g, '').slice(0, 80);

    return {
      tags: ['知识沉淀'],
      summary: summary || '未提供摘要的 Markdown 笔记',
      isFrontmatterParsed: false,
    };
  }
}
