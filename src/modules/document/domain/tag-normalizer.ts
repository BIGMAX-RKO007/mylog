export interface NormalizedTagResult {
  normalizedName: string;
  isMerged: boolean;
  mergedFrom?: string;
}

export class TagNormalizer {
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

  /**
   * 基础词法格式规范化
   */
  static cleanLexical(tag: string): string {
    return tag
      .trim()
      .toLowerCase()
      .replace(/^#+/, '') // 剥离前导 #
      .replace(/[\s_]+/g, '-') // 空格与下划线转中横线
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '') // 移除非中英数符号
      .slice(0, 30);
  }

  /**
   * 完整归一化流程：
   * 1. 词法清洗
   * 2. 权威别名字典映射
   * 3. (可选) 向量数据库语义相似度聚合比对
   */
  static async normalize(
    rawTag: string,
    existingTags: string[] = [],
    aiBinding?: any,
    vectorizeBinding?: any
  ): Promise<NormalizedTagResult> {
    const cleaned = this.cleanLexical(rawTag);
    if (!cleaned) {
      return { normalizedName: '通用', isMerged: false };
    }

    // 1. 字典映射
    if (this.SYNONYM_MAP[cleaned]) {
      const mapped = this.SYNONYM_MAP[cleaned];
      return {
        normalizedName: mapped,
        isMerged: mapped !== cleaned,
        mergedFrom: mapped !== cleaned ? rawTag : undefined,
      };
    }

    // 2. 检查现有标签是否已有完全相同（忽略大小写）
    const matched = existingTags.find((t) => t.toLowerCase() === cleaned.toLowerCase());
    if (matched) {
      return { normalizedName: matched, isMerged: false };
    }

    // 3. 向量聚类比对 (若启用了 Vectorize 与 Workers AI)
    if (vectorizeBinding && aiBinding && typeof aiBinding.run === 'function') {
      try {
        console.log(`📐 [Vectorize] 正在为标签 "${cleaned}" 生成 768 维向量并检索云端向量库...`);
        // 使用 768 维高质向量模型 bge-base-en-v1.5
        const embedRes = await aiBinding.run('@cf/baai/bge-base-en-v1.5', {
          text: [cleaned],
        });
        const vector = embedRes?.data?.[0];

        if (Array.isArray(vector) && vector.length > 0) {
          const queryRes = await vectorizeBinding.query(vector, { topK: 1 });
          const topMatch = queryRes?.matches?.[0];
          console.log(`📐 [Vectorize] 检索结果:`, topMatch ? `命中现有标签 [${topMatch.id}] 相似度: ${topMatch.score}` : '未找到相似标签，判定为全新领域');

          // 相似度阈值 >= 0.85 自动判定合并，收敛标签集
          if (topMatch && topMatch.score >= 0.85 && topMatch.id) {
            console.log(`📐 [Vectorize] 触发语义聚类收敛: "${rawTag}" ➔ 自动合并入标准标签 "${topMatch.id}"`);
            return {
              normalizedName: topMatch.id,
              isMerged: true,
              mergedFrom: rawTag,
            };
          }

          // 若无高相似度，将新标签向量存入 Vectorize
          console.log(`📐 [Vectorize] 正在将全新领域标签 "${cleaned}" 向量写入云端索引...`);
          await vectorizeBinding.insert([
            {
              id: cleaned,
              values: vector,
              metadata: { name: cleaned },
            },
          ]);
        }
      } catch (err) {
        console.warn('TagNormalizer vectorize comparison skipped/failed:', err);
      }
    }


    return { normalizedName: cleaned, isMerged: false };
  }
}
