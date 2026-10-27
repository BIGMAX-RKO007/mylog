import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { requireAuth } from '../middleware/auth-middleware';
import { createMasterSessionToken } from '../middleware/edge-auth-guard';
import { DrivePage, DriveView } from '../views/drive-view';
import { FileGrid } from '../views/components/FileGrid';
import { FileViewer } from '../views/components/FileViewer';
import { UploadModal, UploadPreviewCard } from '../views/components/UploadModal';
import { DocumentConverter } from '../../services/document-converter';
import { AppContext } from '../../core/types';

export const fileRoutes = new Hono<AppContext>();

// 1. 网盘首页 (普通访客访问：什么都不显示；Master 解锁后呈现完整私有网盘)
fileRoutes.get('/', async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';
  const q = c.req.query('q');
  const tag = c.req.query('tag');

  let files: any[] = [];
  let popularTags: { name: string; count: number }[] = [];
  let expandedKeywords: string[] = [];

  // 严格隐私策略：普通访客访问时，绝不查询、绝不泄露任何文档或标签，保持纯白伪装
  if (session) {
    const [searchResult, tags] = await Promise.all([
      documentService.search(q, session?.userId, tag, sort),
      documentService.listPopularTags(20),
    ]);
    files = searchResult.files;
    popularTags = tags;
    expandedKeywords = searchResult.expandedKeywords || [];
  }

  if (c.req.header('HX-Request') && c.req.header('HX-Target') === 'drive-main-container') {
    return c.html(
      <DriveView
        files={files}
        selectedSort={sort}
        searchQuery={q}
        popularTags={popularTags}
        selectedTag={tag}
        expandedKeywords={expandedKeywords}
        session={session}
      />
    );
  }

  return c.html(
    <DrivePage
      files={files}
      selectedSort={sort}
      searchQuery={q}
      popularTags={popularTags}
      selectedTag={tag}
      expandedKeywords={expandedKeywords}
      session={session}
    />
  );
});

// 2. 搜索、按标签筛选或排序刷新文件网格 (HTMX 局部刷新 & 搜索框极客暗门激活)
fileRoutes.get('/files', async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const q = c.req.query('q');
  const tag = c.req.query('tag');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';

  // 极客搜索框暗门协议 (方案 A：隐蔽输入密钥激活 / 锁定退出)
  if (q && q.trim().startsWith(':')) {
    const trimmed = q.trim();

    // 锁定指令: :lock
    if (trimmed.toLowerCase() === ':lock') {
      deleteCookie(c, 'mylog_master_session', { path: '/' });
      deleteCookie(c, 'mylog_session', { path: '/' });
      c.header('HX-Refresh', 'true');
      return c.text('Locked');
    }

    // 解锁指令: :key <key> 或 :unlock <key> 或 :auth <key>
    const unlockMatch = trimmed.match(/^:(?:key|unlock|auth)\s+(.+)$/i);
    if (unlockMatch) {
      const inputKey = unlockMatch[1].trim();
      const masterKey = c.env.MASTER_KEY || 'mylog-master-key';
      if (inputKey === masterKey) {
        const token = await createMasterSessionToken(masterKey);
        const isProd = c.req.url.startsWith('https://');
        setCookie(c, 'mylog_master_session', token, {
          path: '/',
          httpOnly: true,
          secure: isProd,
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24 * 30,
        });
        c.header('HX-Refresh', 'true');
        return c.text('Unlocked');
      }
    }

    // 伪装策略：暗号错误时不给任何提示，假装普通查询且无结果，完全不暴露暗门机制
    return c.html(<FileGrid files={[]} session={undefined} />);
  }

  // 普通访客访问时，什么都不显示
  if (!session) {
    return c.html(<FileGrid files={[]} session={undefined} />);
  }

  const searchResult = await documentService.search(q, session?.userId, tag, sort);
  return c.html(<FileGrid files={searchResult.files} session={session} />);
});

// 3. 打开上传模态框 (HTMX 弹出，仅限已解锁的个人网盘主人)
fileRoutes.get('/files/upload-modal', requireAuth, (c) => {
  const session = c.get('session');
  return c.html(<UploadModal isGuest={!session} />);
});

// 4. 解析并生成即时排版预览 (支持 PPT/PPTX、Office、PDF、代码与通用二进制文件)
fileRoutes.post('/files/preview', requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const { documentService } = c.get('services');

  if (!file || typeof file === 'string') {
    return c.html(<div style="color: var(--danger-color); padding: 1rem;">⚠️ 请选择有效的文件</div>);
  }

  const fileName = (file as File).name || 'document.md';

  try {
    const arrayBuffer = await (file as File).arrayBuffer();
    const content = await DocumentConverter.convertToMarkdown(fileName, arrayBuffer);
    const preview = await documentService.previewUpload(fileName, content, arrayBuffer);
    return c.html(
      <UploadPreviewCard
        fileName={preview.fileName}
        parsed={preview.parsed}
        uploadToken={preview.uploadToken}
      />
    );
  } catch (err: any) {
    return c.html(<div style="color: var(--danger-color); padding: 1rem;">⚠️ {err.message || '文件解析失败'}</div>);
  }
});

// 5. 确认入库到个人网盘 (保存原文件二进制，提取大纲与 AI 标签)
fileRoutes.post('/files/confirm', requireAuth, async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const body = await c.req.parseBody<{ uploadToken?: string }>();
  const uploadToken = body.uploadToken;

  if (!uploadToken) {
    return c.text('缺少入库令牌', 400);
  }

  const ownerRoleId = session?.currentRoleId || 'rol_accountadmin';
  const creatorUserId = session?.userId || 'usr_master';
  const isPublic = false; // 个人网盘上传默认私有，可在面板中一键公开

  try {
    const docMeta = await documentService.commitDocument(uploadToken, ownerRoleId, creatorUserId, isPublic);

    const [files, popularTags, viewData] = await Promise.all([
      session
        ? documentService.listAccessible(session.userId)
        : documentService.listPublic(),
      documentService.listPopularTags(20),
      documentService.getDocumentForView(docMeta.id, session?.userId, !!session?.isMaster),
    ]);

    c.header('HX-Trigger', 'fileUploaded');
    return c.html(
      <>
        <DriveView
          files={files}
          popularTags={popularTags}
          selectedFile={viewData}
          session={session}
        />
        <div id="modal-container" hx-swap-oob="innerHTML"></div>
      </>
    );
  } catch (err: any) {
    return c.text(err.message || '入库失败', 400);
  }
});

// 6. 阅读/查看特定 Markdown 文档与大纲 (自增点击量并支持免登公开访问)
fileRoutes.get('/files/:id', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  // 普通访客访问直接返回 404，绝不泄露任何文件
  if (!session) {
    return c.html(
      <div style="padding: 4rem 1rem; text-align: center; color: var(--text-muted);">
        <h2>404 Not Found</h2>
        <p style="margin-top: 0.5rem; font-size: 0.9rem;">未找到该文档或无权查看</p>
      </div>,
      404
    );
  }

  const userId = session?.userId;
  const isMaster = !!session?.isMaster || session?.roles?.includes('rol_accountadmin');
  const { documentService } = c.get('services');

  try {
    const viewData = await documentService.getDocumentForView(fileId, userId, isMaster);

    if (c.req.header('HX-Request')) {
      return c.html(
        <FileViewer
          metadata={viewData.metadata}
          parsed={viewData.parsed}
          isOwner={viewData.isOwner}
        />
      );
    }

    const [files, popularTags] = await Promise.all([
      isMaster ? documentService.listAccessible(userId || 'usr_master') : documentService.listPublic(),
      documentService.listPopularTags(20),
    ]);

    return c.html(
      <DrivePage
        files={files}
        popularTags={popularTags}
        selectedFile={viewData}
        session={session}
      />
    );
  } catch (err: any) {
    return c.html(
      <div style="padding: 2rem; color: var(--danger-color); text-align: center;">
        <h2>⚠️ 访问受限</h2>
        <p style="margin-top: 0.5rem;">{err.message || '文档不可访问'}</p>
      </div>,
      403
    );
  }
});

// 7. 下载原文件二进制 (支持 PPTX, PDF, Word, Markdown, ZIP 等)
fileRoutes.get('/files/:id/download', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  if (!session) {
    return c.text('Not Found', 404);
  }

  const isMaster = !!session?.isMaster || session?.roles?.includes('rol_accountadmin');
  const { documentService } = c.get('services');

  try {
    const rawFile = await documentService.getRawFile(fileId, isMaster);
    c.header('Content-Type', rawFile.mimeType);
    const encodedName = encodeURIComponent(rawFile.name);
    c.header('Content-Disposition', `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`);
    return c.body(rawFile.buffer);
  } catch (err: any) {
    return c.text(err.message || '文件不存在或无权下载该文件 (403 Forbidden)', 403);
  }
});

// 8. 下载导出的 Markdown 文本
fileRoutes.get('/files/:id/raw', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  if (!session) {
    return c.text('Not Found', 404);
  }
  const userId = session?.userId;
  const isMaster = !!session?.isMaster || session?.roles?.includes('rol_accountadmin');
  const { documentService } = c.get('services');

  try {
    const raw = await documentService.getRawContent(fileId, userId, isMaster);
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(raw.name.replace(/\.[^.]+$/, '') + '.md')}"`);
    return c.body(raw.content);
  } catch (err: any) {
    return c.text(err.message || '无权下载该文件 (403 Forbidden)', 403);
  }
});

// 9. 切换公开/私有可见性状态 (仅 Master 有权切换)
const handleTogglePublic = async (c: any) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const isMaster = !!session?.isMaster || session?.roles?.includes('rol_accountadmin');
  const { documentService } = c.get('services');

  try {
    const meta = await documentService.findById(fileId);
    if (!meta) return c.text('文件不存在', 404);

    const nextState = !meta.isPublic;
    await documentService.updatePublicStatus(fileId, nextState, session.userId, isMaster);

    const updatedView = await documentService.getDocumentForView(fileId, session.userId, isMaster);
    return c.html(
      <FileViewer
        metadata={updatedView.metadata}
        parsed={updatedView.parsed}
        isOwner={true}
      />
    );
  } catch (err: any) {
    return c.text(err.message || '操作失败', 403);
  }
};

fileRoutes.post('/files/:id/toggle-public', requireAuth, handleTogglePublic);
fileRoutes.post('/files/:id/toggle-share', requireAuth, handleTogglePublic);

// 10. 物理删除文件 (仅 Master 有权删除)
fileRoutes.delete('/files/:id', requireAuth, async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const isMaster = !!session?.isMaster || session?.roles?.includes('rol_accountadmin');
  const { documentService } = c.get('services');

  try {
    await documentService.deleteDocument(fileId, session.userId, isMaster);

    const [files, popularTags] = await Promise.all([
      documentService.listAccessible(session.userId),
      documentService.listPopularTags(20),
    ]);

    c.header('HX-Trigger', 'fileDeleted');
    return c.html(
      <DriveView
        files={files}
        popularTags={popularTags}
        session={session}
      />
    );
  } catch (err: any) {
    return c.text(err.message || '删除失败', 403);
  }
});
