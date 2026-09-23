import { UserSession } from '../core/types';

export interface UserRecord {
  id: string;
  username: string;
  isActive: boolean;
  createdAt: number;
}

export interface UserSummary {
  id: string;
  username: string;
  isActive: boolean;
  createdAt: number;
}

export class AuthService {
  constructor(private db: D1Database) {}

  // -------------------------------------------------------------
  // SSO 用户与角色映射同步 (核心)
  // -------------------------------------------------------------

  async syncSsoUser(ssoUser: { id: string; username: string; roles: string[] }): Promise<{ sessionToken: string; session: UserSession }> {
    const userId = ssoUser.id;
    const username = ssoUser.username.trim().toLowerCase();
    const now = Date.now();

    // 1. 确保用户在本地 D1 users 表中存在
    const existingUser = await this.db
      .prepare('SELECT id, is_active FROM users WHERE id = ?')
      .bind(userId)
      .first<{ id: string; is_active: number }>();

    if (!existingUser) {
      await this.db
        .prepare('INSERT INTO users (id, username, password_hash, is_active, created_at) VALUES (?, ?, ?, 1, ?)')
        .bind(userId, username, 'SSO_MANAGED_IDENTITY', now)
        .run();
    }

    // 2. 确保私有角色和角色映射存在 (Snowflake 模式)
    const privateRoleId = `rol_user_${userId.slice(4)}`;
    await this.db
      .prepare('INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(privateRoleId, `ROLE_${username.toUpperCase()}`, `User ${username}'s private ownership role`, now)
      .run();

    await this.db
      .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, privateRoleId, 'MYAUTH_SSO', now)
      .run();

    await this.db
      .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, 'rol_user', 'MYAUTH_SSO', now)
      .run();

    // 3. 同步来自 myauth 的系统特权角色 (如 rol_accountadmin / rol_admin)
    if (Array.isArray(ssoUser.roles)) {
      for (const roleId of ssoUser.roles) {
        if (roleId === 'rol_accountadmin' || roleId === 'rol_admin') {
          await this.db
            .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
            .bind(userId, roleId, 'MYAUTH_SSO', now)
            .run();
        }
      }
    }

    // 4. 查询当前用户拥有的角色
    const roleRows = await this.db
      .prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
      .bind(userId)
      .all<{ role_id: string }>();

    const roleIds = roleRows.results ? roleRows.results.map((r) => r.role_id) : [privateRoleId, 'rol_user'];
    const currentRoleId = roleIds.includes('rol_accountadmin') ? 'rol_accountadmin' : (roleIds[0] || privateRoleId);

    // 5. 签发本地 Session (7天有效)
    const sessionToken = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7;

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, current_role_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(sessionToken, userId, currentRoleId, expiresAt)
      .run();

    return {
      sessionToken,
      session: {
        userId,
        username,
        currentRoleId,
        roles: roleIds,
      },
    };
  }

  // -------------------------------------------------------------
  // 本地 Session 快速验证与销毁
  // -------------------------------------------------------------

  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const session = await this.db
      .prepare('SELECT user_id, current_role_id, expires_at FROM sessions WHERE id = ?')
      .bind(sessionToken)
      .first<{ user_id: string; current_role_id: string; expires_at: number }>();

    if (!session || session.expires_at < Date.now()) {
      return null;
    }

    const user = await this.db
      .prepare('SELECT id, username, is_active FROM users WHERE id = ?')
      .bind(session.user_id)
      .first<{ id: string; username: string; is_active: number }>();

    if (!user || user.is_active !== 1) {
      return null;
    }

    const roleRows = await this.db
      .prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
      .bind(user.id)
      .all<{ role_id: string }>();

    const roleIds = roleRows.results ? roleRows.results.map((r) => r.role_id) : [];

    return {
      userId: user.id,
      username: user.username,
      currentRoleId: session.current_role_id,
      roles: roleIds,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionToken)
      .run();
  }

  async listAllUsers(): Promise<UserSummary[]> {
    const { results } = await this.db
      .prepare('SELECT id, username, is_active, created_at FROM users ORDER BY created_at DESC')
      .all<{ id: string; username: string; is_active: number; created_at: number }>();

    return results.map((r) => ({
      id: r.id,
      username: r.username,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
    }));
  }
}
