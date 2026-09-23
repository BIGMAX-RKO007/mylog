export type Privilege = 'READ' | 'WRITE' | 'DELETE' | 'OWNERSHIP';

export interface InheritanceRule {
  parentRoleId: string;
  childRoleId: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  usernames: string[];
}

export interface GrantMatrixItem {
  id: string;
  roleId: string;
  roleName: string;
  objectId: string;
  fileName: string;
  fileTitle: string;
  privilege: Privilege;
  grantedBy: string;
  grantedByName: string;
  grantedAt: number;
}

export interface UserRoleAssignment {
  userId: string;
  username: string;
  roleId: string;
  roleName: string;
  grantedBy: string;
  grantedByName: string;
  grantedAt: number;
}

export interface PrivilegeDiagnosis {
  directRoleNames: string[];
  inheritedRoleNames: string[];
  grantedPrivileges: string[];
  isPublic: boolean;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  isOwner: boolean;
}

export class RbacService {
  constructor(private db: D1Database) {}

  /**
   * 静态纯计算方法：计算用户的所有有效角色（直接角色 + 递归继承的子角色）
   * Snowflake 规则：如果 parent_role 继承自 child_role，则拥有 parent_role 的用户自动获得 child_role 的所有权限。
   */
  static resolveEffectiveRoles(
    directRoleIds: string[],
    inheritanceRules: InheritanceRule[]
  ): Set<string> {
    const effectiveRoles = new Set<string>(directRoleIds);
    let addedNewRole = true;

    while (addedNewRole) {
      addedNewRole = false;
      for (const rule of inheritanceRules) {
        if (effectiveRoles.has(rule.parentRoleId) && !effectiveRoles.has(rule.childRoleId)) {
          effectiveRoles.add(rule.childRoleId);
          addedNewRole = true;
        }
      }
    }

    return effectiveRoles;
  }

  /**
   * 静态纯计算方法：判定有效角色集合是否对目标对象具备指定特权 (Snowflake 规则)
   */
  static evaluatePrivilege(
    effectiveRoleIds: Set<string>,
    grants: Array<{ roleId: string; objectId: string; privilege: Privilege }>,
    targetObjectId: string,
    requiredPrivilege: Privilege,
    isObjectPublic = false
  ): boolean {
    if (isObjectPublic && requiredPrivilege === 'READ') {
      return true;
    }

    for (const grant of grants) {
      if (grant.objectId === targetObjectId && effectiveRoleIds.has(grant.roleId)) {
        if (grant.privilege === 'OWNERSHIP' || grant.privilege === requiredPrivilege) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 使用高效递归 CTE 直接在 D1 中执行 Snowflake 权限推导：
   * 1. 递归展开用户拥有的全部角色（直接 + 继承）
   * 2. 超级管理员全局旁路判定 (rol_accountadmin 或 rol_admin 自动拥有全量特权)
   * 3. 判定是否存在目标对象的所需特权或 OWNERSHIP
   * 4. 判定是否为公开只读文件
   */
  async hasPrivilege(userId: string | undefined, objectId: string, requiredPrivilege: Privilege): Promise<boolean> {
    // 匿名访客处理
    if (!userId) {
      if (requiredPrivilege !== 'READ') return false;
      const publicRow = await this.db
        .prepare('SELECT 1 FROM files WHERE id = ? AND is_public = 1 LIMIT 1')
        .bind(objectId)
        .first();
      return !!publicRow;
    }

    const query = `
      WITH RECURSIVE user_effective_roles AS (
        SELECT role_id FROM user_roles WHERE user_id = ?
        UNION
        SELECT ri.child_role_id
        FROM role_inheritance ri
        JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
      )
      -- 1. 系统超级管理员 (rol_accountadmin 或 rol_admin) 拥有全局最高操作特权 (含 DELETE / OWNERSHIP)
      SELECT 1 AS allowed
      FROM user_effective_roles
      WHERE role_id IN ('rol_accountadmin', 'rol_admin')
      UNION
      -- 2. 对象显式授权或拥有者特权
      SELECT 1 AS allowed
      FROM grants g
      WHERE g.object_id = ?
        AND (g.privilege = ? OR g.privilege = 'OWNERSHIP')
        AND g.role_id IN (SELECT role_id FROM user_effective_roles)
      UNION
      -- 3. 公开可读
      SELECT 1 AS allowed
      FROM files f
      WHERE f.id = ? AND f.is_public = 1 AND ? = 'READ'
      LIMIT 1;
    `;

    const row = await this.db
      .prepare(query)
      .bind(userId, objectId, requiredPrivilege, objectId, requiredPrivilege)
      .first<{ allowed: number }>();

    return !!row;
  }

  // -------------------------------------------------------------
  // 管理中心 RBAC 运维能力 (Admin Dashboard)
  // -------------------------------------------------------------

  async createRole(id: string, name: string, description?: string): Promise<void> {
    await this.db
      .prepare('INSERT INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(id, name, description || null, Date.now())
      .run();
  }

  async assignRoleToUser(userId: string, roleId: string, grantedBy: string): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, roleId, grantedBy, Date.now())
      .run();
  }

  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?')
      .bind(userId, roleId)
      .run();
  }

  async grantPrivilege(roleId: string, objectId: string, privilege: Privilege, grantedBy: string): Promise<void> {
    const grantId = `grt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await this.db
      .prepare('INSERT INTO grants (id, role_id, object_id, privilege, granted_by, granted_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(grantId, roleId, objectId, privilege, grantedBy, Date.now())
      .run();
  }

  async revokeGrantById(grantId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM grants WHERE id = ?')
      .bind(grantId)
      .run();
  }

  async getAllRolesWithUsers(): Promise<RoleDetail[]> {
    const { results } = await this.db
      .prepare(`
        SELECT r.id, r.name, r.description, r.is_system, 
               GROUP_CONCAT(u.username, ', ') as usernames,
               COUNT(ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        LEFT JOIN users u ON ur.user_id = u.id
        GROUP BY r.id
        ORDER BY r.is_system DESC, r.created_at ASC
      `)
      .all<{
        id: string;
        name: string;
        description: string | null;
        is_system: number;
        usernames: string | null;
        user_count: number;
      }>();

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.is_system === 1,
      userCount: r.user_count,
      usernames: r.usernames ? r.usernames.split(', ') : [],
    }));
  }

  async getAllGrantsMatrix(): Promise<GrantMatrixItem[]> {
    const { results } = await this.db
      .prepare(`
        SELECT g.id, g.role_id, r.name as role_name, g.object_id,
               f.name as file_name, f.title as file_title,
               g.privilege, g.granted_by, u.username as granted_by_name, g.granted_at
        FROM grants g
        JOIN roles r ON g.role_id = r.id
        JOIN files f ON g.object_id = f.id
        LEFT JOIN users u ON g.granted_by = u.id
        ORDER BY g.granted_at DESC
      `)
      .all<{
        id: string;
        role_id: string;
        role_name: string;
        object_id: string;
        file_name: string;
        file_title: string;
        privilege: string;
        granted_by: string;
        granted_by_name: string | null;
        granted_at: number;
      }>();

    return results.map((r) => ({
      id: r.id,
      roleId: r.role_id,
      roleName: r.role_name,
      objectId: r.object_id,
      fileName: r.file_name,
      fileTitle: r.file_title,
      privilege: r.privilege as Privilege,
      grantedBy: r.granted_by,
      grantedByName: r.granted_by_name || 'System',
      grantedAt: r.granted_at,
    }));
  }

  async getAllUserRoleAssignments(): Promise<UserRoleAssignment[]> {
    const { results } = await this.db
      .prepare(`
        SELECT ur.user_id, u.username, ur.role_id, r.name as role_name,
               ur.granted_by, gb.username as granted_by_name, ur.granted_at
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN users gb ON ur.granted_by = gb.id
        ORDER BY ur.granted_at DESC
      `)
      .all<{
        user_id: string;
        username: string;
        role_id: string;
        role_name: string;
        granted_by: string;
        granted_by_name: string | null;
        granted_at: number;
      }>();

    return results.map((r) => ({
      userId: r.user_id,
      username: r.username,
      roleId: r.role_id,
      roleName: r.role_name,
      grantedBy: r.granted_by,
      grantedByName: r.granted_by_name || 'System',
      grantedAt: r.granted_at,
    }));
  }

  async diagnosePrivileges(userId: string, objectId: string): Promise<PrivilegeDiagnosis> {
    const directRoleRows = await this.db
      .prepare('SELECT r.id, r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?')
      .bind(userId)
      .all<{ id: string; name: string }>();

    const directRoleNames = directRoleRows.results.map((r) => r.name);

    const effectiveRows = await this.db
      .prepare(`
        WITH RECURSIVE user_effective_roles AS (
          SELECT role_id FROM user_roles WHERE user_id = ?
          UNION
          SELECT ri.child_role_id
          FROM role_inheritance ri
          JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
        )
        SELECT r.id, r.name FROM user_effective_roles uer JOIN roles r ON uer.role_id = r.id;
      `)
      .bind(userId)
      .all<{ id: string; name: string }>();

    const allRoleNames = effectiveRows.results.map((r) => r.name);
    const inheritedRoleNames = allRoleNames.filter((n) => !directRoleNames.includes(n));

    const grantRows = await this.db
      .prepare(`
        WITH RECURSIVE user_effective_roles AS (
          SELECT role_id FROM user_roles WHERE user_id = ?
          UNION
          SELECT ri.child_role_id
          FROM role_inheritance ri
          JOIN user_effective_roles uer ON ri.parent_role_id = uer.role_id
        )
        SELECT privilege FROM grants
        WHERE object_id = ? AND role_id IN (SELECT role_id FROM user_effective_roles)
      `)
      .bind(userId, objectId)
      .all<{ privilege: string }>();

    const grantedPrivileges = grantRows.results.map((g) => g.privilege);

    const fileRow = await this.db
      .prepare('SELECT is_public FROM files WHERE id = ?')
      .bind(objectId)
      .first<{ is_public: number }>();

    const isPublic = fileRow?.is_public === 1;
    const isAdmin = effectiveRows.results.some((r) => r.id === 'rol_accountadmin' || r.id === 'rol_admin');
    const isOwner = grantedPrivileges.includes('OWNERSHIP') || isAdmin;
    const canRead = isOwner || grantedPrivileges.includes('READ') || isPublic;
    const canWrite = isOwner || grantedPrivileges.includes('WRITE');
    const canDelete = isOwner || grantedPrivileges.includes('DELETE');

    return {
      directRoleNames,
      inheritedRoleNames,
      grantedPrivileges,
      isPublic,
      canRead,
      canWrite,
      canDelete,
      isOwner,
    };
  }
}
