async function verifyProductionAI() {
  const prodUrl = 'https://bigmax.dpdns.org';
  console.log(`🌐 正在针对生产环境发起端到端真机验证: ${prodUrl} ...\n`);

  // 1. 注册测试管理员或普通用户
  const testUser = `ai_verifier_${Date.now().toString().slice(-4)}`;
  const regParams = new URLSearchParams({
    username: testUser,
    password: 'Password123!',
  });

  console.log(`1. 注册生产测试用户 [${testUser}]...`);
  const regRes = await fetch(`${prodUrl}/register`, {
    method: 'POST',
    body: regParams,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirect: 'manual',
  });

  const cookie = regRes.headers.get('set-cookie');
  console.log(`- 获得生产 Session Cookie: ${!!cookie}`);

  // 2. 准备一篇全新的技术 Markdown 文档 (故意使用一个新标签 "rust-lang")
  const testDoc = `---
title: Rust 与 WebAssembly 在边缘计算中的实战经验
tags: [rust-lang, wasm, 性能优化]
summary: 探讨利用 Rust 编译为 Wasm 并在 Cloudflare Workers 边缘运行的加速方案
verified: true
---

# 背景
在追求极致性能的计算场景中，V8 原生 JS 可能会遇到高密集计算的 CPU 瓶颈...

# 优化策略
通过 wasm-pack 构建轻量 binary 并以内联方式载入。
`;

  console.log('\n2. 上传测试技术文档...');
  const formData = new FormData();
  const fileBlob = new Blob([testDoc], { type: 'text/markdown' });
  formData.append('file', fileBlob, 'rust-wasm.md');

  const previewRes = await fetch(`${prodUrl}/files/preview`, {
    method: 'POST',
    body: formData,
    headers: cookie ? { Cookie: cookie.split(';')[0] } : {},
  });

  const previewHtml = await previewRes.text();
  const tokenMatch = previewHtml.match(/name="uploadToken"\s+value="([^"]+)"/);

  if (!tokenMatch) {
    console.error('❌ 获取 uploadToken 失败:', previewHtml.slice(0, 300));
    return;
  }

  const uploadToken = tokenMatch[1];
  console.log(`- 获取 uploadToken 成功: ${uploadToken.slice(0, 16)}...`);

  // 3. 提交确认入库 (此时云端 Worker 会触发 Vectorize 写入与 AI 解析)
  console.log('3. 提交入库，触发云端 Vectorize 向量化与 D1 写入...');
  const commitRes = await fetch(`${prodUrl}/files/confirm`, {
    method: 'POST',
    body: new URLSearchParams({ uploadToken, isPublic: 'true' }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { Cookie: cookie.split(';')[0] } : {}),
    },
  });

  console.log(`- 入库结果 HTTP Status: ${commitRes.status}`);

  // 4. 测试搜索端 AI 意图理解与同义词扩展
  console.log('\n4. 测试生产环境搜索与 AI 意图扩展...');
  const searchRes = await fetch(`${prodUrl}/files?q=sql`);
  const searchHtml = await searchRes.text();
  const hasAiBanner = searchHtml.includes('ai-expansion-banner') || searchHtml.includes('智能管理员');
  console.log(`- 搜 "sql" 时生产环境返回状态: ${searchRes.status}`);
  console.log(`- 是否命中相关文档: ${searchHtml.includes('bento-card')}`);

  console.log('\n🎉 生产接口调用完成！');
}

verifyProductionAI().catch(console.error);
