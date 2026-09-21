import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth-middleware';
import { PreviewDocumentUseCase } from '../../modules/document/application/preview-document';
import { DrivePage, DriveView } from '../views/drive-view';
import { FileGrid } from '../views/components/FileGrid';
import { FileViewer } from '../views/components/FileViewer';
import { UploadModal, UploadPreviewCard } from '../views/components/UploadModal';
import { AppContext } from '../../core/types';

export const fileRoutes = new Hono<AppContext>();

// 1. 网盘首页 (未登录直接浏览公开知识库，登录后展示全部管理资源)
fileRoutes.get('/', async (c) => {
  const session = c.get('session');
  const { docRepo, categoryRepo } = c.get('services');
  const categoryId = c.req.query('categoryId');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';
  const q = c.req.query('q');

  const [files, categories] = await Promise.all([
    session
      ? docRepo.listAccessible(session.userId, q, categoryId, sort)
      : docRepo.listPublic(q, categoryId, sort),
    categoryRepo.getTree(),
  ]);

  if (c.req.header('HX-Request') && c.req.header('HX-Target') === 'drive-main-container') {
    return c.html(
      <DriveView
        files={files}
        categories={categories}
        selectedCategoryId={categoryId}
        selectedSort={sort}
        searchQuery={q}
        session={session}
      />
    );
  }

  return c.html(
    <DrivePage
      files={files}
      categories={categories}
      selectedCategoryId={categoryId}
      selectedSort={sort}
      searchQuery={q}
      session={session}
    />
  );
});

// 2. 搜索或按分类、排序刷新文件网格 (HTMX 局部刷新)
fileRoutes.get('/files', async (c) => {
  const session = c.get('session');
  const { docRepo } = c.get('services');
  const q = c.req.query('q');
  const categoryId = c.req.query('categoryId');
  const sort = (c.req.query('sort') as 'latest' | 'views') || 'latest';

  const files = session
    ? await docRepo.listAccessible(session.userId, q, categoryId, sort)
    : await docRepo.listPublic(q, categoryId, sort);

  return c.html(<FileGrid files={files} />);
});

// 3. 打开上传模态框 (HTMX 弹出，支持游客与登录管理员)
fileRoutes.get('/files/upload-modal', (c) => {
  const session = c.get('session');
  return c.html(<UploadModal isGuest={!session} />);
});

// 4. 解析并生成即时排版预览 (支持分类选项预加载)
fileRoutes.post('/files/preview', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const { categoryRepo } = c.get('services');

  if (!file || typeof file === 'string') {
    return c.html(<div style="color: var(--danger-color); padding: 1rem;">⚠️ 请选择有效的 Markdown 文件</div>);
  }

  const fileName = (file as File).name || 'document.md';
  const content = await (file as File).text();

  const [result, categories] = await Promise.all([
    PreviewDocumentUseCase.execute(fileName, content),
    categoryRepo.getTree(),
  ]);

  if (!result.success) {
    return c.html(<div style="color: var(--danger-color); padding: 1rem;">⚠️ {result.error.message}</div>);
  }

  return c.html(
    <UploadPreviewCard
      fileName={result.data.fileName}
      parsed={result.data.parsed}
      uploadToken={result.data.uploadToken}
      categories={categories}
    />
  );
});

// 5. 确认入库到 R2 与 D1 (支持用户自选分类或自动未分类)
fileRoutes.post('/files/confirm', async (c) => {
  const session = c.get('session');
  const { docRepo, commitDocUseCase, getDocUseCase, categoryRepo } = c.get('services');
  const body = await c.req.parseBody<{ uploadToken?: string; categoryId?: string }>();
  const uploadToken = body.uploadToken;
  const categoryId = body.categoryId;

  if (!uploadToken) {
    return c.text('缺少入库令牌', 400);
  }

  // 区分游客与已登录用户
  const ownerRoleId = session ? session.currentRoleId : 'rol_public';
  const creatorUserId = session ? session.userId : 'usr_guest';
  const isPublic = !session; // 游客上传默认公开

  const commitResult = await commitDocUseCase.execute(uploadToken, ownerRoleId, creatorUserId, isPublic, categoryId);
  if (!commitResult.success) {
    return c.text(commitResult.error.message, 400);
  }

  const [files, categories, viewResult] = await Promise.all([
    session
      ? docRepo.listAccessible(session.userId)
      : docRepo.listPublic(),
    categoryRepo.getTree(),
    getDocUseCase.execute(commitResult.data.id, session?.userId),
  ]);

  c.header('HX-Trigger', 'fileUploaded');
  return c.html(
    <>
      <DriveView
        files={files}
        categories={categories}
        selectedFile={viewResult.success ? viewResult.data : undefined}
        session={session}
      />
      <div id="modal-container" hx-swap-oob="innerHTML"></div>
    </>
  );
});

// 6. 阅读/查看特定 Markdown 文档 (自增点击量并支持公开分享免登访问)
fileRoutes.get('/files/:id', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  const userId = session?.userId;
  const { docRepo, getDocUseCase, categoryRepo } = c.get('services');

  // 自增文档点击量/阅读量
  await docRepo.incrementViews(fileId);

  const [result, categories] = await Promise.all([
    getDocUseCase.execute(fileId, userId),
    categoryRepo.getTree(),
  ]);

  if (!result.success) {
    return c.html(
      <div style="padding: 2rem; color: var(--danger-color); text-align: center;">
        <h2>⚠️ 访问受限</h2>
        <p style="margin-top: 0.5rem;">{result.error.message}</p>
      </div>,
      403
    );
  }

  // 累加后的即时展现
  result.data.metadata.views = (result.data.metadata.views || 0) + 1;

  if (c.req.header('HX-Request')) {
    return c.html(
      <FileViewer
        metadata={result.data.metadata}
        parsed={result.data.parsed}
        isOwner={result.data.isOwner}
      />
    );
  }

  const files = userId
    ? await docRepo.listAccessible(userId)
    : await docRepo.listPublic();

  return c.html(
    <DrivePage
      files={files}
      categories={categories}
      selectedFile={result.data}
      session={session}
    />
  );
});

// 7. 下载原始 .md 文件
fileRoutes.get('/files/:id/raw', async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session');
  const userId = session?.userId;
  const { docRepo, storage, checkPermissionUseCase } = c.get('services');

  const canRead = await checkPermissionUseCase.canAccess(userId, fileId, 'READ');
  if (!canRead) {
    return c.text('无权下载该文件 (403 Forbidden)', 403);
  }

  const meta = await docRepo.findById(fileId);
  if (!meta) return c.text('文件不存在', 404);

  const rawContent = await storage.get(meta.r2Key);
  if (rawContent === null) return c.text('存储中找不到内容', 404);

  c.header('Content-Type', 'text/markdown; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(meta.name)}"`);
  return c.body(rawContent);
});

// 8. 切换公开分享状态
fileRoutes.post('/files/:id/toggle-share', requireAuth, async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const { docRepo, getDocUseCase, checkPermissionUseCase } = c.get('services');

  const isOwner = await checkPermissionUseCase.canAccess(session.userId, fileId, 'OWNERSHIP');
  if (!isOwner) {
    return c.text('只有所有者有权调整分享权限', 403);
  }

  const meta = await docRepo.findById(fileId);
  if (!meta) return c.text('文件不存在', 404);

  const nextState = !meta.isPublic;
  await docRepo.updatePublicStatus(fileId, nextState);

  const updatedResult = await getDocUseCase.execute(fileId, session.userId);
  if (!updatedResult.success) return c.text('获取更新失败', 500);

  return c.html(
    <FileViewer
      metadata={updatedResult.data.metadata}
      parsed={updatedResult.data.parsed}
      isOwner={true}
    />
  );
});

// 9. 物理删除文档 (基于 Snowflake RBAC 严格鉴权，级联清理 R2 + D1)
fileRoutes.delete('/files/:id', requireAuth, async (c) => {
  const fileId = c.req.param('id');
  if (!fileId) return c.text('缺少文件ID', 400);

  const session = c.get('session')!;
  const { docRepo, deleteDocUseCase, categoryRepo } = c.get('services');

  const deleteResult = await deleteDocUseCase.execute(session.userId, fileId);
  if (!deleteResult.success) {
    return c.text(deleteResult.error, 403);
  }

  const [files, categories] = await Promise.all([
    docRepo.listAccessible(session.userId),
    categoryRepo.getTree(),
  ]);

  c.header('HX-Trigger', 'fileDeleted');
  return c.html(<DriveView files={files} categories={categories} session={session} />);
});
