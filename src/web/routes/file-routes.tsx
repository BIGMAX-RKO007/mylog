import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth-middleware';
import { DrivePage, DriveView } from '../views/drive-view';
import { FileGrid } from '../views/components/FileGrid';
import { FileViewer } from '../views/components/FileViewer';
import { UploadModal, UploadPreviewCard } from '../views/components/UploadModal';
import { AppContext } from '../../core/types';

export const fileRoutes = new Hono<AppContext>();

// 1. 网盘首页 (未登录浏览公开知识库，登录展示全部管理资源)
fileRoutes.get('/', async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';
  const q = c.req.query('q');
  const tag = c.req.query('tag');

  const [searchResult, popularTags] = await Promise.all([
    documentService.search(q, session?.userId, tag, sort),
    documentService.listPopularTags(20),
  ]);

  const files = searchResult.files;

  if (c.req.header('HX-Request') && c.req.header('HX-Target') === 'drive-main-container') {
    return c.html(
      <DriveView
        files={files}
        selectedSort={sort}
        searchQuery={q}
        popularTags={popularTags}
        selectedTag={tag}
        expandedKeywords={searchResult.expandedKeywords}
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
      expandedKeywords={searchResult.expandedKeywords}
      session={session}
    />
  );
});

// 2. 搜索、按标签筛选或排序刷新文件网格 (HTMX 局部刷新)
fileRoutes.get('/files', async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const q = c.req.query('q');
  const tag = c.req.query('tag');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';

  const searchResult = await documentService.search(q, session?.userId, tag, sort);
  return c.html(<FileGrid files={searchResult.files} session={session} />);
});

// 3. 打开上传模态框 (HTMX 弹出)
fileRoutes.get('/files/upload-modal', (c) => {
  const session = c.get('session');
  return c.html(<UploadModal isGuest={!session} />);
});

// 4. 解析并生成即时排版预览 (免二次网络上传)
fileRoutes.post('/files/preview', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const { documentService } = c.get('services');

  if (!file || typeof file === 'string') {
    return c.html(<div style="color: var(--danger-color); padding: 1rem;">⚠️ 请选择有效的 Markdown 文件</div>);
  }

  const fileName = (file as File).name || 'document.md';
  const content = await (file as File).text();

  try {
    const preview = await documentService.previewUpload(fileName, content);
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

// 5. 确认入库到 D1 (触发双轨元数据提取与标签向量收敛)
fileRoutes.post('/files/confirm', async (c) => {
  const session = c.get('session');
  const { documentService } = c.get('services');
  const body = await c.req.parseBody<{ uploadToken?: string }>();
  const uploadToken = body.uploadToken;

  if (!uploadToken) {
    return c.text('缺少入库令牌', 400);
  }

  const ownerRoleId = session ? session.currentRoleId : 'rol_public';
  const creatorUserId = session ? session.userId : 'usr_guest';
  const isPublic = !session; // 游客上传默认公开

  try {
    const docMeta = await documentService.commitDocument(uploadToken, ownerRoleId, creatorUserId, isPublic);

    const [files, popularTags, viewData] = await Promise.all([
      session
        ? documentService.listAccessible(session.userId)
        : documentService.listPublic(),
      documentService.listPopularTags(20),
      documentService.getDocumentForView(docMeta.id, session?.userId),
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

// 6. 阅读/查看特定 Markdown 文档 (自增点击量并支持免登公开访问)
fileRoutes.get('/files/:id', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  const userId = session?.userId;
  const { documentService } = c.get('services');

  try {
    const viewData = await documentService.getDocumentForView(fileId, userId);

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
      userId ? documentService.listAccessible(userId) : documentService.listPublic(),
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

// 7. 下载原始 .md 文件
fileRoutes.get('/files/:id/raw', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  const userId = session?.userId;
  const { documentService } = c.get('services');

  try {
    const raw = await documentService.getRawContent(fileId, userId);
    c.header('Content-Type', 'text/markdown; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(raw.name)}"`);
    return c.body(raw.content);
  } catch (err: any) {
    return c.text(err.message || '无权下载该文件 (403 Forbidden)', 403);
  }
});

// 8. 切换公开分享状态
fileRoutes.post('/files/:id/toggle-share', requireAuth, async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const { documentService } = c.get('services');

  try {
    const meta = await documentService.findById(fileId);
    if (!meta) return c.text('文件不存在', 404);

    const nextState = !meta.isPublic;
    await documentService.updatePublicStatus(fileId, nextState, session.userId);

    const updatedView = await documentService.getDocumentForView(fileId, session.userId);
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
});

// 9. 物理删除文档 (基于 Snowflake RBAC 鉴权，自动级联清理孤儿标签)
fileRoutes.delete('/files/:id', requireAuth, async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const { documentService } = c.get('services');

  try {
    await documentService.deleteDocument(fileId, session.userId);

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
