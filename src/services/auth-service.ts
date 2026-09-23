import { UserSession } from '../core/types';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
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
  private static ITERATIONS = 100000;
  private static KEY_LEN = 32; // 256 bits

  constructor(private db: D1Database) {}

  // -------------------------------------------------------------
  // 密码哈希与验证 (基于标准 Web Crypto API)
  // -------------------------------------------------------------

  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      this.KEY_LEN * 8
    );

    const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
  }

  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, expectedHashHex] = storedHash.split(':');
    if (!saltHex || !expectedHashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      this.KEY_LEN * 8
    );

    const actualHashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return actualHashHex === expectedHashHex;
  }

  // -------------------------------------------------------------
  // 用户注册与登录
  // -------------------------------------------------------------

  async register(username: string, password: string): Promise<{ sessionToken: string; session: UserSession }> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      throw new Error('用户名至少需要 3 个字符');
    }
    if (!password || password.length < 6) {
      throw new Error('密码至少需要 6 个字符');
    }

    const existing = await this.db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(trimmed)
      .first<{ id: string }>();

    if (existing) {
      throw new Error('该用户名已被占用');
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const passwordHash = await AuthService.hashPassword(password);
    const now = Date.now();

    // 1. 创建用户
    await this.db
      .prepare('INSERT INTO users (id, username, password_hash, is_active, created_at) VALUES (?, ?, ?, 1, ?)')
      .bind(userId, trimmed, passwordHash, now)
      .run();

    // 2. 为新用户创建专有的私有所有权角色 (Snowflake 模式)
    const privateRoleId = `rol_user_${userId.slice(4)}`;
    await this.db
      .prepare('INSERT INTO roles (id, name, description, is_system, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(privateRoleId, `ROLE_${trimmed.toUpperCase()}`, `User ${trimmed}'s private ownership role`, now)
      .run();

    // 3. 授予私有角色与标准普通用户角色
    await this.db
      .prepare('INSERT INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, privateRoleId, 'SYSTEM', now)
      .run();

    await this.db
      .prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES (?, ?, ?, ?)')
      .bind(userId, 'rol_user', 'SYSTEM', now)
      .run();

    // 4. 签发会话 Token
    const sessionToken = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7; // 7 天有效

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, current_role_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(sessionToken, userId, privateRoleId, expiresAt)
      .run();

    return {
      sessionToken,
      session: {
        userId,
        username: trimmed,
        currentRoleId: privateRoleId,
        roles: [privateRoleId, 'rol_user'],
      },
    };
  }

  async login(username: string, password: string): Promise<{ sessionToken: string; session: UserSession }> {
    const trimmed = username.trim().toLowerCase();
    const user = await this.db
      .prepare('SELECT id, username, password_hash, is_active FROM users WHERE username = ?')
      .bind(trimmed)
      .first<{ id: string; username: string; password_hash: string; is_active: number }>();

    if (!user || user.is_active !== 1) {
      throw new Error('用户名或密码错误');
    }

    const isValid = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }

    // 获取用户拥有的角色列表
    const roleRows = await this.db
      .prepare('SELECT role_id FROM user_roles WHERE user_id = ?')
      .bind(user.id)
      .all<{ role_id: string }>();

    const roleIds = roleRows.results ? roleRows.results.map((r) => r.role_id) : [];
    const currentRoleId = roleIds[0] || 'rol_public';

    const sessionToken = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7;

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, current_role_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(sessionToken, user.id, currentRoleId, expiresAt)
      .run();

    return {
      sessionToken,
      session: {
        userId: user.id,
        username: user.username,
        currentRoleId,
        roles: roleIds,
      },
    };
  }

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
