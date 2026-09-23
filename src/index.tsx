import { Hono } from 'hono';
import { AppContext } from './core/types';
import { AuthService } from './services/auth-service';
import { RbacService } from './services/rbac-service';
import { DocumentService } from './services/document-service';

import { authRoutes } from './web/routes/auth-routes';
import { fileRoutes } from './web/routes/file-routes';
import { adminRbacRoutes } from './web/routes/admin-rbac-routes';
import { ssoSessionMiddleware } from './web/middleware/edge-auth-guard';
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

// 2. 全局服务注入 (DI Container: 经典三层服务) 与 myauth SSO 会话中间件
app.use('*', async (c, next) => {
  const authService = new AuthService(c.env.DB);
  const rbacService = new RbacService(c.env.DB);
  const documentService = new DocumentService(
    c.env.DB,
    c.env.AI,
    c.env.TAG_VECTORS,
    rbacService
  );

  c.set('services', {
    authService,
    rbacService,
    documentService,
  });

  return ssoSessionMiddleware(c, next);
});

// 3. 挂载认证、文档与权限中心业务路由
app.route('/', authRoutes);
app.route('/', fileRoutes);
app.route('/', adminRbacRoutes);

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
      let mutationTest: any = null;
      let queryTest: any = null;

      // 如果带有 ?testMutation=true，触发端到端写入和检索测试
      const testMutation = c.req.query('testMutation');
      if (testMutation === 'true' && report.workersAi?.status === 'healthy') {
        const embed = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: ['test-infra'] });
        const vector = embed?.data?.[0];
        if (vector) {
          mutationTest = await c.env.TAG_VECTORS.upsert([
            { id: 'infra-health-probe', values: vector, namespace: 'tags' },
          ]);
          queryTest = await c.env.TAG_VECTORS.query(vector, { topK: 1 });
        }
      }

      report.vectorize = {
        status: 'healthy',
        details: describeRes,
        ...(mutationTest ? { mutationTest, queryTest } : {}),
      };
    } catch (err: any) {
      report.vectorize = { status: 'error', message: err.message || String(err) };
    }
  }

  // 4. 验证 myauth 统一认证中心连通性
  const authHubUrl = c.env.AUTH_HUB_URL || 'https://bigmax.dpdns.org';
  const appId = c.env.MYAUTH_APP_ID || 'app_mylog';
  try {
    const authPingStart = Date.now();
    const authResp = await fetch(`${authHubUrl}/api/verify`, {
      signal: AbortSignal.timeout(3000),
    });
    report.myauth = {
      status: authResp.status === 401 || authResp.ok ? 'healthy' : 'degraded',
      authHubUrl,
      appId,
      httpStatus: authResp.status,
      latencyMs: Date.now() - authPingStart,
    };
  } catch (err: any) {
    report.myauth = {
      status: 'error',
      authHubUrl,
      appId,
      message: err.message || String(err),
    };
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
