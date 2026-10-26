import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth-middleware';
import { AiChatService, ChatMessage } from '../../services/ai-chat-service';
import { AppContext } from '../../core/types';

export const aiChatRoutes = new Hono<AppContext>();

// 1. 发送消息与 AI 对话 (必须是已解锁 Master)
aiChatRoutes.post('/api/chat', requireAuth, async (c) => {
  const body = await c.req.json<{ messages: ChatMessage[] }>().catch(() => ({ messages: [] }));
  const messages = body.messages || [];

  if (messages.length === 0) {
    return c.json({ error: '消息内容不能为空' }, 400);
  }

  const aiChatService = new AiChatService(c.env.AI);
  const reply = await aiChatService.chat(messages);

  return c.json({ reply });
});

// 2. 聊完一键提炼为结构化 Markdown 并存入网盘
aiChatRoutes.post('/api/chat/distill', requireAuth, async (c) => {
  const session = c.get('session');
  const body = await c.req.json<{ messages: ChatMessage[] }>().catch(() => ({ messages: [] }));
  const messages = body.messages || [];

  if (messages.length === 0) {
    return c.json({ error: '对话记录为空，无法提炼' }, 400);
  }

  const { documentService } = c.get('services');
  const aiChatService = new AiChatService(c.env.AI);

  try {
    // 1. 让 AI 提炼精华标题与结构化正文
    const { title, markdown } = await aiChatService.distillToMarkdown(messages);

    // 2. 存入个人网盘 (私有，默认仅主人可见)
    const ownerRoleId = session?.currentRoleId || 'rol_accountadmin';
    const creatorUserId = session?.userId || 'usr_master';
    const docMeta = await documentService.saveMarkdownNote(title, markdown, ownerRoleId, creatorUserId, false);

    return c.json({
      success: true,
      docId: docMeta.id,
      title: docMeta.title,
      fileName: docMeta.name,
      message: '🎉 已成功将本次对话精华整理为 Markdown 并存入您的个人网盘！',
    });
  } catch (err: any) {
    return c.json({ error: err.message || '提炼存盘失败' }, 500);
  }
});
