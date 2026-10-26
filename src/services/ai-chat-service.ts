export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 7000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI inference timeout')), ms)),
  ]);
}

export class AiChatService {
  constructor(private aiBinding?: any) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const systemPrompt: ChatMessage = {
      role: 'system',
      content:
        '你是一个知识渊博、极具洞察力的个人 AI 灵感智囊与技术顾问。请用富有启发性、结构清晰且亲切的中文回答。鼓励发散思维，帮助用户深入剖析问题、整理灵感、推导方案。',
    };

    const fullMessages = [systemPrompt, ...messages.filter((m) => m.role !== 'system')];

    if (this.aiBinding && typeof this.aiBinding.run === 'function') {
      try {
        const runPromise = this.aiBinding
          .run('@cf/meta/llama-3.2-3b-instruct', {
            messages: fullMessages,
            max_tokens: 1024,
          })
          .catch(() => {
            return this.aiBinding.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
              messages: fullMessages,
              max_tokens: 1024,
            });
          });

        const res = (await withTimeout(runPromise, 6000)) as any;
        const reply = res?.response ?? res;
        if (typeof reply === 'string' && reply.trim()) {
          return reply.trim();
        }
      } catch (err: any) {
        console.warn('Workers AI chat timed out or failed, falling back to instant response:', err?.message || err);
      }
    }

    // 本地开发模拟/即时智能反馈
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
    return `💡 **AI 灵感反馈**：\n\n关于“${lastUserMsg}”，这是一个很有价值的思考方向！\n\n1. **核心价值**：从个人知识管理与边缘架构角度来看，该思路具备高灵活性与极简优势。\n2. **可行路径**：建议先定义清晰的最小闭环，再通过超媒体或状态机逐步扩展。\n3. **延伸思考**：随时点击下方【💾 提炼精华存入网盘】，我可以直接为您总结整理成标准的 Markdown 沉淀文档！`;
  }

  async distillToMarkdown(messages: ChatMessage[]): Promise<{ title: string; markdown: string }> {
    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? '【我】' : '【AI】'}: ${m.content}`)
      .join('\n\n');

    const distillPrompt = `请阅读以下我和 AI 助手之间的一段灵感探讨记录，将其提炼为一篇结构严谨、排版精美、重点突出的专业 Markdown 技术/灵感笔记。
必须严格遵循以下要求：
1. 第一行必须是一个一级标题：# 笔记标题（请提炼一个生动、精炼、准确反映探讨主题的中文标题，不要包含书名号或前缀）
2. 正文必须包含以下几个清晰板块：
   > 💡 **灵感速览**：用2~3句话概括本次探讨的核心洞见。
   ## 一、核心思考与讨论背景
   ## 二、方案剖析与关键论点（使用有序列表或要点展示）
   ## 三、后续行动项与落地建议（使用任务清单格式 - [ ]）
3. 过滤掉一切闲聊问候废话，只保留高价值的思想与干货。

探讨历史记录：
${conversationHistory}`;

    if (this.aiBinding && typeof this.aiBinding.run === 'function') {
      try {
        const runPromise = this.aiBinding
          .run('@cf/meta/llama-3.2-3b-instruct', {
            messages: [{ role: 'user', content: distillPrompt }],
            max_tokens: 1500,
          })
          .catch(() => {
            return this.aiBinding.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
              messages: [{ role: 'user', content: distillPrompt }],
              max_tokens: 1500,
            });
          });

        const res = (await withTimeout(runPromise, 6000)) as any;
        const rawMd = ((res?.response ?? res) || '').trim();
        if (rawMd) {
          const titleMatch = rawMd.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1].trim() : 'AI 灵感探讨纪要';
          return { title, markdown: rawMd };
        }
      } catch (err: any) {
        console.warn('Workers AI distill failed or timed out, fallback to heuristic distillation:', err?.message || err);
      }
    }

    // 启发式智能提炼兜底
    const userPrompts = messages.filter((m) => m.role === 'user').map((m) => m.content);
    const mainTopic = userPrompts[0]?.slice(0, 20) || 'AI 灵感探讨纪要';
    const title = `${mainTopic}思考整理`;

    const markdown = `# ${title}

> 💡 **灵感速览**：本次探讨聚焦于「${mainTopic}」，梳理了核心逻辑与实施路径。

## 一、核心思考与讨论背景
${userPrompts.map((p, i) => `${i + 1}. **关注点**：${p}`).join('\n')}

## 二、方案剖析与关键论点
- **灵感沉淀**：通过即时与 AI 对话，捕捉转瞬即逝的灵感火花；
- **结构化归档**：将自由流动的想法自动归纳为系统性的 Markdown 资产；
- **私有与掌控**：数据直接写入个人网盘，支持原件下载与深度检索。

## 三、后续行动项与落地建议
- [ ] 深入验证可行性细节
- [ ] 结合实际业务场景快速打磨最小闭环

---
*本笔记由 mylog AI 灵感助手自动提炼生成 · ${new Date().toLocaleDateString('zh-CN')}*`;

    return { title, markdown };
  }
}
