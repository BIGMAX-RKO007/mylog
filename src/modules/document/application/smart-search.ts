import { DocumentRepositoryPort } from '../ports/document-repository';
import { DocumentMetadata } from '../domain/types';

export interface SmartSearchResult {
  files: DocumentMetadata[];
  expandedKeywords?: string[];
  matchedTag?: string;
}

export class SmartSearchUseCase {
  constructor(
    private docRepo: DocumentRepositoryPort,
    private aiBinding?: any
  ) {}

  /**
   * 智能意图搜索
   */
  async search(
    query?: string,
    userId?: string,
    categoryId?: string,
    tag?: string,
    sort?: 'latest' | 'views'
  ): Promise<SmartSearchResult> {
    const trimmedQuery = query?.trim() || '';

    // 1. 如果指定了特定标签过滤，直接直通 D1 检索 (0 次 AI 调用)
    if (tag && tag.trim()) {
      const files = userId
        ? await this.docRepo.listAccessible(userId, trimmedQuery, categoryId, sort, tag.trim())
        : await this.docRepo.listPublic(trimmedQuery, categoryId, sort, tag.trim());
      return { files, matchedTag: tag.trim() };
    }

    // 2. 如果未输入关键词，直接获取正常列表
    if (!trimmedQuery) {
      const files = userId
        ? await this.docRepo.listAccessible(userId, undefined, categoryId, sort)
        : await this.docRepo.listPublic(undefined, categoryId, sort);
      return { files };
    }

    // 3. 先走精准字面检索作为底色
    const initialFiles = userId
      ? await this.docRepo.listAccessible(userId, trimmedQuery, categoryId, sort)
      : await this.docRepo.listPublic(trimmedQuery, categoryId, sort);

    // 4. 如果没有配置 AI 绑定，直接返回精准检索结果
    if (!this.aiBinding || typeof this.aiBinding.run !== 'function') {
      return { files: initialFiles };
    }

    // 5. 智能意图扩展 (AI 扩词)
    let expandedWords: string[] = [];
    try {
      const prompt = `你是一个技术搜索意图分析引擎。用户搜索了: "${trimmedQuery}"。
请推断其真实意图，给出 2 到 4 个最相关的技术同义词、缩写或关联词。
必须只返回逗号分隔的词语列表，不要输出任何其他文字或标点：
例如输入 sql，输出：数据库,db,database,sqlite`;

      const aiRes = await this.aiBinding.run('@cf/qwen/qwen1.5-7b-chat', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
      }).catch(() => {
        return this.aiBinding.run('@cf/meta/llama-3-8b-instruct', {
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

    // 6. 聚合多路召回结果 (按相关性去重合并)
    const fileMap = new Map<string, DocumentMetadata>();
    for (const f of initialFiles) {
      fileMap.set(f.id, f);
    }

    for (const word of expandedWords) {
      const moreFiles = userId
        ? await this.docRepo.listAccessible(userId, word, categoryId, sort)
        : await this.docRepo.listPublic(word, categoryId, sort);

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
