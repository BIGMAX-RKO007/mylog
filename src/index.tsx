import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { AppContext } from './core/types';
import { globalEventBus } from './core/event-bus';
import { D1UserRepository } from './modules/iam/infrastructure/d1-user-repository';
import { D1RbacRepository } from './modules/iam/infrastructure/d1-rbac-repository';
import { AuthenticateUserUseCase } from './modules/iam/application/authenticate-user';
import { CheckPermissionUseCase } from './modules/iam/application/check-permission';
import { D1StorageAdapter } from './modules/document/infrastructure/d1-storage-adapter';
import { D1DocumentRepository } from './modules/document/infrastructure/d1-document-repository';
import { CommitDocumentUseCase } from './modules/document/application/commit-document';
import { GetDocumentUseCase } from './modules/document/application/get-document';
import { DeleteDocumentUseCase } from './modules/document/application/delete-document';
import { SmartSearchUseCase } from './modules/document/application/smart-search';
import { D1CategoryRepository } from './modules/document/infrastructure/d1-category-repository';

import { authRoutes } from './web/routes/auth-routes';
import { fileRoutes } from './web/routes/file-routes';
import { adminRbacRoutes } from './web/routes/admin-rbac-routes';
import { categoryRoutes } from './web/routes/category-routes';
import { MAIN_CSS } from './web/styles/css';

const app = new Hono<AppContext>();

// 1. 静态 CSS 样式路由 (边缘直接响应)
app.get('/styles/main.css', (c) => {
  return new Response(MAIN_CSS, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

// 2. 全局服务注入 (DI Container) 与 认证中间件
app.use('*', async (c, next) => {
  const d1UserRepo = new D1UserRepository(c.env.DB);
  const d1RbacRepo = new D1RbacRepository(c.env.DB);
  const d1DocRepo = new D1DocumentRepository(c.env.DB);
  const categoryRepo = new D1CategoryRepository(c.env.DB);
  const d1Storage = new D1StorageAdapter(c.env.DB);

  const authUseCase = new AuthenticateUserUseCase(d1UserRepo, d1RbacRepo);
  const checkPermissionUseCase = new CheckPermissionUseCase(d1RbacRepo);
  const commitDocUseCase = new CommitDocumentUseCase(
    d1Storage,
    d1DocRepo,
    globalEventBus,
    c.env.AI,
    c.env.TAG_VECTORS
  );
  const getDocUseCase = new GetDocumentUseCase(d1Storage, d1DocRepo, checkPermissionUseCase);
  const deleteDocUseCase = new DeleteDocumentUseCase(d1Storage, d1DocRepo, checkPermissionUseCase);
  const smartSearchUseCase = new SmartSearchUseCase(d1DocRepo, c.env.AI);

  c.set('services', {
    d1UserRepo,
    d1RbacRepo,
    docRepo: d1DocRepo,
    categoryRepo,
    storage: d1Storage,
    authUseCase,
    checkPermissionUseCase,
    commitDocUseCase,
    getDocUseCase,
    deleteDocUseCase,
    smartSearchUseCase,
  });


  const sessionToken = getCookie(c, 'mylog_session');
  if (sessionToken) {
    const session = await authUseCase.validateSession(sessionToken);
    if (session) {
      c.set('session', session);
    }
  }

  await next();
});

// 3. 挂载认证与网盘业务路由
app.route('/', authRoutes);
app.route('/', fileRoutes);
app.route('/', adminRbacRoutes);
app.route('/', categoryRoutes);

// 4. 基础设施健康与真机验证诊断接口 (用于确凿验证 AI 与 Vectorize)
app.get('/api/health-infra', async (c) => {
  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    d1: 'unknown',
    workersAi: 'unknown',
    vectorize: 'unknown',
  };

  // 1. 验证 D1
  try {
    const d1Res = await c.env.DB.prepare('SELECT COUNT(*) as count FROM files').first<{ count: number }>();
    report.d1 = { status: 'healthy', fileCount: d1Res?.count ?? 0 };
  } catch (err: any) {
    report.d1 = { status: 'error', message: err.message || String(err) };
  }

  // 2. 验证 Workers AI
  if (!c.env.AI) {
    report.workersAi = { status: 'missing_binding' };
  } else {
    try {
      // 测试向量 Embedding 模型 (768 维)
      const embedTest = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: ['基础设施测试'] });
      // 测试文本生成模型
      const textGenTest = await c.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 10,
      });

      report.workersAi = {
        status: 'healthy',
        embeddingModel: '@cf/baai/bge-base-en-v1.5',
        vectorDimensions: embedTest?.data?.[0]?.length || 0,
        generationModel: '@cf/meta/llama-3.2-3b-instruct',
        generationSample: textGenTest?.response || textGenTest,
      };
    } catch (err: any) {
      report.workersAi = { status: 'error', message: err.message || String(err) };
    }
  }

  // 3. 验证 Vectorize 向量库
  if (!c.env.TAG_VECTORS) {
    report.vectorize = { status: 'missing_binding' };
  } else {
    try {
      const describeRes = await c.env.TAG_VECTORS.describe();
      report.vectorize = {
        status: 'healthy',
        details: describeRes,
      };
    } catch (err: any) {
      report.vectorize = { status: 'error', message: err.message || String(err) };
    }
  }

  return c.json(report);
});


// 全局异常捕获
app.onError((err, c) => {
  console.error('Unhandled Application Error:', err);
  return c.html(
    <div style="padding: 2rem; color: #f85149; font-family: sans-serif; text-align: center;">
      <h2>⚠️ 系统发生错误</h2>
      <p style="margin-top: 0.5rem; color: #8b949e;">{err.message || '未知错误'}</p>
      <a href="/" style="display: inline-block; margin-top: 1rem; color: #58a6ff;">返回主页</a>
    </div>,
    500
  );
});

export default app;
