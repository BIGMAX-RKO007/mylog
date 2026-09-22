export interface ExtractedMetadata {
  title?: string;
  tags: string[];
  summary?: string;
  isFrontmatterParsed: boolean;
}

export class MetadataExtractor {
  // 常见主流技术/领域关键词识别库（用于无 AI 时的智能启发式提取）
  private static readonly TECH_KEYWORDS = [
    'HTMX', 'Markdown', 'AI', 'Agent', 'Zero', 'Cloudflare', 'D1', 'R2', 'Workers',
    'Docker', 'K8s', 'Kubernetes', 'Linux', 'Nginx', 'Rust', 'Go', 'Golang',
    'Python', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Next.js', 'Hono',
    'SQL', 'SQLite', 'PostgreSQL', 'MySQL', 'Redis', 'RBAC', '安全', '运维',
    '算法', '数学', '物理', '微积分', '情感', '心理', '系统设计', '排坑', '架构'
  ];

  /**
   * 鲁棒解析 Markdown YAML Frontmatter (兼容 \r\n, \n, 空格与不同数组写法)
   */
  static parseFrontmatter(markdown: string): { frontmatter: Record<string, any>; cleanBody: string } | null {
    if (!markdown) return null;

    // 匹配前导空白后由 --- 包裹的 Frontmatter
    const match = markdown.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) {
      return null;
    }

    const frontmatterRaw = match[1].trim();
    const cleanBody = markdown.slice(match[0].length).trim();

    const result: Record<string, any> = {};
    const lines = frontmatterRaw.split(/\r?\n/);

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();

      // 处理数组: [a, b, c] 或列表
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

  /**
   * 启发式智能关键词与标签提取 (当没有 Frontmatter 且 AI 不可用时的动态提取算法)
   */
  static extractHeuristic(markdown: string): { tags: string[]; summary: string } {
    const lines = markdown.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';
    const contentSample = markdown.slice(0, 1500);

    // 1. 文档本质类型优先判定 (如简历/求职/架构/手册等)
    const isResume = /(?:简历|履历|求职|教育背景|工作经历|项目经验|resume|curriculum vitae)/i.test(firstLine + '\n' + contentSample);
    const matchedTags: string[] = [];
    if (isResume) {
      matchedTags.push('简历', '求职档案');
    }

    // 2. 扫描匹配知名技术/主题关键词 (不区分大小写)
    if (matchedTags.length < 3) {
      for (const kw of this.TECH_KEYWORDS) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(contentSample) && !matchedTags.includes(kw)) {
          matchedTags.push(kw);
          if (matchedTags.length >= 3) break;
        }
      }
    }

    // 2. 若未匹配到已知库，从第一行标题切取有效词
    if (matchedTags.length === 0) {
      const cleanTitle = firstLine.replace(/^[#\s\-_*]+/, '').trim();
      const chunks = cleanTitle.split(/[\s,，、—\-_/]+/).filter((s) => s.length >= 2 && s.length <= 8);
      if (chunks.length > 0) {
        matchedTags.push(...chunks.slice(0, 2));
      } else {
        matchedTags.push('知识经验');
      }
    }

    // 3. 提炼一句话核心摘要 (从正文第 1~3 行清理 markdown 符号后抽取)
    const bodyLines = lines.filter((l) => !l.startsWith('#')).slice(0, 3);
    let summary = bodyLines.join(' ').replace(/[#*`_~>]/g, '').trim();
    if (!summary || summary.length < 10) {
      summary = lines.slice(0, 2).join(' ').replace(/[#*`_~>]/g, '').trim();
    }
    summary = summary.slice(0, 80);

    return {
      tags: matchedTags.slice(0, 3),
      summary: summary || '暂无详细摘要',
    };
  }

  /**
   * 双轨制元数据提取核心入口：
   * 1. 快车道：YAML Frontmatter 0 Token 瞬时提取
   * 2. 辅道：Workers AI 结构化提炼
   * 3. 动态启发式兜底：智能分析标题与正文关键词 (绝不死板打硬编码标签)
   */
  static async extract(
    markdown: string,
    aiBinding?: any
  ): Promise<ExtractedMetadata> {
    // 1. 快车道 (Fast Track: YAML Frontmatter)
    const parsedFm = this.parseFrontmatter(markdown);
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
        isFrontmatterParsed: true,
      };
    }

    // 2. 辅道 (Workers AI 结构化提炼)
    if (aiBinding && typeof aiBinding.run === 'function') {
      try {
        const preview = markdown.slice(0, 1500);
        const prompt = `你是一个专业技术知识库管理员。请仔细阅读以下文档，提炼 1~3 个最能代表文档核心本质或主题的标签（例如若为简历则提炼"简历","求职档案"；若为系统设计则提炼"系统设计","架构"等，切忌盲目罗列正文中提到的编程语言名称），并撰写一句话（30-50字）的核心内容摘要。
必须严格只返回 JSON 格式，不要包含任何 markdown 标记或额外废话：
{"tags": ["主题标签1", "主题标签2"], "summary": "30-50字的核心内容摘要"}

文档内容：
${preview}`;

        // 优先使用高响应速度的 Llama 3.2 3B，兜底使用 Llama 3.1 8B FP8
        const aiResponse = await aiBinding.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
        }).catch(() => {
          return aiBinding.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          });
        });

        // 兼容 Cloudflare Workers AI 自动解析 JSON 对象的场景
        const resp = aiResponse?.response ?? aiResponse;
        if (resp && typeof resp === 'object') {
          if (Array.isArray(resp.tags) && resp.tags.length > 0) {
            return {
              tags: resp.tags.slice(0, 3).map((t: any) => String(t).trim()),
              summary: typeof resp.summary === 'string' ? resp.summary.trim() : undefined,
              isFrontmatterParsed: false,
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
              isFrontmatterParsed: false,
            };
          }
        }
      } catch (err) {
        console.warn('Workers AI extraction fallback to heuristic:', err);
      }
    }

    // 3. 动态启发式关键词提取兜底 (即使没有 AI，也能根据内容生成精准的标签)
    const heuristic = this.extractHeuristic(markdown);
    return {
      tags: heuristic.tags,
      summary: heuristic.summary,
      isFrontmatterParsed: false,
    };
  }
}
