import { Hono } from 'hono';
import { AppContext } from '../../core/types';
import {
  RbacDashboardView,
  GrantsTable,
  DiagnosticResult,
  ForbiddenView,
  UserRolesTable,
} from '../views/admin/RbacDashboardView';
import { Privilege } from '../../services/rbac-service';

export const adminRbacRoutes = new Hono<AppContext>();

// 权限拦截中间件：仅系统超级管理员 (ACCOUNTADMIN) 可访问 RBAC 管理中心
adminRbacRoutes.use('/admin/*', async (c, next) => {
  const session = c.get('session');
  if (!session) {
    if (c.req.header('HX-Request')) {
      c.header('HX-Redirect', '/login');
      return c.text('', 401);
    }
    return c.redirect('/login');
  }

  const isAdmin = session.roles?.includes('rol_accountadmin');
  if (!isAdmin) {
    return c.html(<ForbiddenView session={session} />, 403);
  }

  await next();
});

/**
 * 权限中心主页面 (仅管理员可访问)
 */
adminRbacRoutes.get('/admin/rbac', async (c) => {
  const session = c.get('session')!;
  const { rbacService, authService, documentService } = c.get('services');

  const [roles, grants, userRoles, users, files] = await Promise.all([
    rbacService.getAllRolesWithUsers(),
    rbacService.getAllGrantsMatrix(),
    rbacService.getAllUserRoleAssignments(),
    authService.listAllUsers(),
    documentService.listAccessible(session.userId),
  ]);

  return c.html(
    <RbacDashboardView
      roles={roles}
      grants={grants}
      userRoles={userRoles}
      users={users}
      files={files}
      session={session}
    />
  );
});

/**
 * 授予特权 (GRANT)
 */
adminRbacRoutes.post('/admin/rbac/grant', async (c) => {
  const session = c.get('session')!;
  const { rbacService } = c.get('services');
  const body = await c.req.parseBody();

  const objectId = String(body['objectId'] || '').trim();
  const roleId = String(body['roleId'] || '').trim();
  const privilege = String(body['privilege'] || '').trim() as Privilege;

  if (!objectId || !roleId || !privilege) {
    const grants = await rbacService.getAllGrantsMatrix();
    return c.html(<GrantsTable grants={grants} />);
  }

  // 写入 Snowflake 授权
  await rbacService.grantPrivilege(roleId, objectId, privilege, session.userId);

  const updatedGrants = await rbacService.getAllGrantsMatrix();
  return c.html(<GrantsTable grants={updatedGrants} />);
});

/**
 * 撤销特权 (REVOKE)
 */
adminRbacRoutes.post('/admin/rbac/revoke', async (c) => {
  const { rbacService } = c.get('services');
  const body = await c.req.parseBody();
  const grantId = String(body['grantId'] || '').trim();

  if (grantId) {
    await rbacService.revokeGrantById(grantId);
  }

  const updatedGrants = await rbacService.getAllGrantsMatrix();
  return c.html(<GrantsTable grants={updatedGrants} />);
});

/**
 * 实时特权模拟诊断器 (Privilege Simulator)
 */
adminRbacRoutes.post('/admin/rbac/test', async (c) => {
  const { rbacService, authService, documentService } = c.get('services');
  const body = await c.req.parseBody();

  const userId = String(body['userId'] || '').trim();
  const objectId = String(body['objectId'] || '').trim();

  if (!userId || !objectId) {
    return c.html(<DiagnosticResult error="请先选择需要诊断的用户和文档！" />);
  }

  try {
    const [diagnosis, users, file] = await Promise.all([
      rbacService.diagnosePrivileges(userId, objectId),
      authService.listAllUsers(),
      documentService.findById(objectId),
    ]);

    const targetUser = users.find((u) => u.id === userId);
    const targetFileTitle = file?.title || file?.name || objectId;

    return c.html(
      <DiagnosticResult
        diagnosis={diagnosis}
        targetUsername={targetUser?.username || userId}
        targetFileTitle={targetFileTitle}
      />
    );
  } catch (err: any) {
    return c.html(<DiagnosticResult error={err.message || '诊断计算时发生未知错误'} />);
  }
});

/**
 * 授予用户角色 (GRANT ROLE <role> TO USER <user>)
 */
adminRbacRoutes.post('/admin/rbac/user-role/assign', async (c) => {
  const session = c.get('session')!;
  const { rbacService } = c.get('services');
  const body = await c.req.parseBody();

  const userId = String(body['userId'] || '').trim();
  const roleId = String(body['roleId'] || '').trim();

  if (userId && roleId) {
    await rbacService.assignRoleToUser(userId, roleId, session.userId);
  }

  const updatedUserRoles = await rbacService.getAllUserRoleAssignments();
  return c.html(<UserRolesTable userRoles={updatedUserRoles} currentUserId={session.userId} />);
});

/**
 * 撤销用户角色 (REVOKE ROLE <role> FROM USER <user>)
 */
adminRbacRoutes.post('/admin/rbac/user-role/revoke', async (c) => {
  const session = c.get('session')!;
  const { rbacService } = c.get('services');
  const body = await c.req.parseBody();

  const userId = String(body['userId'] || '').trim();
  const roleId = String(body['roleId'] || '').trim();

  if (userId && roleId) {
    // 保护：防止唯一管理员把自己撤销导致死锁
    if (!(userId === session.userId && roleId === 'rol_accountadmin')) {
      await rbacService.revokeRoleFromUser(userId, roleId);
    }
  }

  const updatedUserRoles = await rbacService.getAllUserRoleAssignments();
  return c.html(<UserRolesTable userRoles={updatedUserRoles} currentUserId={session.userId} />);
});
