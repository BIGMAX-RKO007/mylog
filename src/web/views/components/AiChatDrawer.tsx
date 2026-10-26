import { FC } from 'hono/jsx';

export const AiChatDrawer: FC = () => {
  return (
    <>
      {/* 1. 右下角常驻悬浮按钮：AI 灵感随想 */}
      <button
        id="fab-ai-chat-btn"
        class="fab-ai-chat"
        title="与 AI 畅聊灵感，一键提炼存入网盘"
        onclick="window.toggleAiChatDrawer(true)"
      >
        <span class="fab-ai-aura"></span>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.2"/>
        </svg>
        <span class="fab-label">AI 灵感随想</span>
      </button>

      {/* 2. 抽屉 / 侧边对话面板 */}
      <div id="ai-chat-drawer" class="ai-chat-panel-container" style="display: none;">
        <div class="ai-chat-panel">
          {/* 面板头部 */}
          <div class="ai-panel-header">
            <div class="ai-header-left">
              <div class="ai-spark-badge">✨</div>
              <div>
                <h3 class="ai-panel-title">AI 灵感随想</h3>
                <p class="ai-panel-sub">畅聊构想 · 提炼精华存入网盘</p>
              </div>
            </div>
            <div class="ai-header-actions">
              <button
                type="button"
                class="ai-action-btn"
                title="清空当前对话"
                onclick="window.clearAiChat()"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button
                type="button"
                class="ai-action-btn"
                title="收起窗口"
                onclick="window.toggleAiChatDrawer(false)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 消息滚动流 */}
          <div id="ai-chat-messages" class="ai-messages-flow">
            <div class="ai-msg-bubble ai-msg-bot">
              <div class="ai-avatar-icon">🤖</div>
              <div class="ai-msg-content">
                <p>嗨！我是您的个人网盘 <strong>AI 灵感助手</strong> 💡</p>
                <p style="margin-top: 0.4rem;">
                  随时跟我聊聊技术方案、架构选型、突发灵感或阅读心得。聊完点击下方的 <strong>「💾 提炼精华存入网盘」</strong>，我将自动帮您总结整理成结构严谨的 Markdown 笔记沉淀下来！
                </p>
              </div>
            </div>
          </div>

          {/* 提炼反馈提示条 */}
          <div id="ai-distill-alert" class="ai-distill-feedback" style="display: none;"></div>

          {/* 底部输入与操作中枢 */}
          <div class="ai-panel-footer">
            <div class="ai-quick-tools">
              <button
                id="btn-distill-save"
                type="button"
                class="btn-distill"
                onclick="window.distillAndSaveChat()"
                title="让 AI 将对话精华整理成 Markdown 并直接存入您的私有网盘"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                <span>💾 提炼精华存入网盘</span>
              </button>
            </div>

            <div class="ai-input-row">
              <textarea
                id="ai-chat-textarea"
                class="ai-chat-input"
                placeholder="输入您的灵感或问题 (Enter 发送，Shift+Enter 换行)..."
                rows={1}
                onkeydown="
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    window.sendAiMessage();
                  }
                "
              ></textarea>
              <button
                id="btn-ai-send"
                type="button"
                class="btn-ai-send"
                onclick="window.sendAiMessage()"
                title="发送"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 前端交互核心逻辑 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          window.aiChatHistory = [];

          window.toggleAiChatDrawer = function(show) {
            const el = document.getElementById('ai-chat-drawer');
            if (!el) return;
            const curOpen = el.style.display !== 'none';
            const targetOpen = typeof show === 'boolean' ? show : !curOpen;
            el.style.display = targetOpen ? 'flex' : 'none';
            if (targetOpen) {
              setTimeout(() => {
                const inp = document.getElementById('ai-chat-textarea');
                if (inp) inp.focus();
              }, 50);
            }
          };

          window.clearAiChat = function() {
            if (!confirm('确定要清空本次灵感对话吗？')) return;
            window.aiChatHistory = [];
            const flow = document.getElementById('ai-chat-messages');
            if (flow) {
              flow.innerHTML = \`
                <div class="ai-msg-bubble ai-msg-bot">
                  <div class="ai-avatar-icon">🤖</div>
                  <div class="ai-msg-content">
                    <p>已为您开启新对话！随时随地，有想法立刻跟我聊聊 💡</p>
                  </div>
                </div>
              \`;
            }
          };

          window.sendAiMessage = async function() {
            const textarea = document.getElementById('ai-chat-textarea');
            const flow = document.getElementById('ai-chat-messages');
            if (!textarea || !flow) return;

            const text = (textarea.value || '').trim();
            if (!text) return;

            textarea.value = '';
            textarea.style.height = 'auto';

            // 1. 添加用户消息到前端与历史
            window.aiChatHistory.push({ role: 'user', content: text });
            
            const userBubble = document.createElement('div');
            userBubble.className = 'ai-msg-bubble ai-msg-user';
            userBubble.innerHTML = \`<div class="ai-msg-content"><p>\${escapeHtml(text)}</p></div>\`;
            flow.appendChild(userBubble);

            // 2. 添加等待指示器
            const loadingBubble = document.createElement('div');
            loadingBubble.className = 'ai-msg-bubble ai-msg-bot ai-msg-loading';
            loadingBubble.id = 'ai-temp-loading';
            loadingBubble.innerHTML = \`
              <div class="ai-avatar-icon">🤖</div>
              <div class="ai-msg-content">
                <div class="ai-typing-dots"><span></span><span></span><span></span></div>
              </div>
            \`;
            flow.appendChild(loadingBubble);
            flow.scrollTop = flow.scrollHeight;

            try {
              const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: window.aiChatHistory })
              });

              const data = await res.json();
              loadingBubble.remove();

              if (data.reply) {
                window.aiChatHistory.push({ role: 'assistant', content: data.reply });
                const botBubble = document.createElement('div');
                botBubble.className = 'ai-msg-bubble ai-msg-bot';
                botBubble.innerHTML = \`
                  <div class="ai-avatar-icon">🤖</div>
                  <div class="ai-msg-content">\${renderSimpleMarkdown(data.reply)}</div>
                \`;
                flow.appendChild(botBubble);
              } else {
                const errBubble = document.createElement('div');
                errBubble.className = 'ai-msg-bubble ai-msg-bot';
                errBubble.innerHTML = \`<div class="ai-msg-content" style="color:#ef4444;">⚠️ 响应失败: \${data.error || '模型繁忙'}</div>\`;
                flow.appendChild(errBubble);
              }
            } catch (err) {
              loadingBubble.remove();
              const errBubble = document.createElement('div');
              errBubble.className = 'ai-msg-bubble ai-msg-bot';
              errBubble.innerHTML = \`<div class="ai-msg-content" style="color:#ef4444;">⚠️ 网络请求异常，请稍候重试</div>\`;
              flow.appendChild(errBubble);
            }

            flow.scrollTop = flow.scrollHeight;
          };

          window.distillAndSaveChat = async function() {
            if (!window.aiChatHistory || window.aiChatHistory.length === 0) {
              alert('当前还没有对话内容哦，先跟 AI 聊聊您的灵感吧！');
              return;
            }

            const btn = document.getElementById('btn-distill-save');
            const alertBox = document.getElementById('ai-distill-alert');
            if (btn) {
              btn.disabled = true;
              btn.innerHTML = '<span>🤖 正在智能提炼入库...</span>';
            }

            try {
              const res = await fetch('/api/chat/distill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: window.aiChatHistory })
              });

              const data = await res.json();

              if (data.success) {
                if (alertBox) {
                  alertBox.style.display = 'block';
                  alertBox.className = 'ai-distill-feedback success';
                  alertBox.innerHTML = \`
                    <span>🎉 成功提炼并存入网盘：<strong>\${escapeHtml(data.title)}</strong></span>
                    <a href="/files/\${data.docId}" class="view-note-link">立即阅读 ➔</a>
                  \`;
                }

                // 刷新主页卡片列表 (利用 HTMX)
                const gridTarget = document.getElementById('file-grid-container');
                if (gridTarget && window.htmx) {
                  window.htmx.ajax('GET', '/files', { target: '#file-grid-container', swap: 'innerHTML' });
                }
              } else {
                alert('提炼失败: ' + (data.error || '未知错误'));
              }
            } catch (e) {
              alert('请求异常，请检查网络连接');
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = \`
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  <span>💾 提炼精华存入网盘</span>
                \`;
              }
            }
          };

          function escapeHtml(str) {
            return str.replace(/[&<>"']/g, function(m) {
              return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
            });
          }

          function renderSimpleMarkdown(md) {
            let html = escapeHtml(md);
            // 简单加粗与代码
            html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            html = html.replace(/\\n/g, '<br/>');
            return html;
          }
        `
      }} />
    </>
  );
};
