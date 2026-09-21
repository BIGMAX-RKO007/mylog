import { Hono } from 'hono';
import { AppContext } from '../../core/types';
import { CategoryModal } from '../views/components/CategoryModal';

export const categoryRoutes = new Hono<AppContext>();

// 获取分类管理模态框
categoryRoutes.get('/categories/modal', async (c) => {
  const { categoryRepo } = c.get('services');
  const tree = await categoryRepo.getTree();
  return c.html(<CategoryModal categories={tree} />);
});

// 新增分类
categoryRoutes.post('/categories', async (c) => {
  const { categoryRepo } = c.get('services');
  const body = await c.req.parseBody();
  const name = String(body['name'] || '').trim();
  const parentId = String(body['parentId'] || '').trim() || null;

  if (name) {
    await categoryRepo.create(name, parentId);
  }

  const tree = await categoryRepo.getTree();
  c.header('HX-Trigger', 'categoryChanged');
  return c.html(<CategoryModal categories={tree} successMessage={`分类「${name}」已成功创建！`} />);
});

// 删除分类
categoryRoutes.delete('/categories/:id', async (c) => {
  const { categoryRepo } = c.get('services');
  const id = c.req.param('id');

  if (id) {
    await categoryRepo.delete(id);
  }

  const tree = await categoryRepo.getTree();
  c.header('HX-Trigger', 'categoryChanged');
  return c.html(<CategoryModal categories={tree} successMessage="分类已安全删除，关联文档已归入「未分类」！" />);
});
