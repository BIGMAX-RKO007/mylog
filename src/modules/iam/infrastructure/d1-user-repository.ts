import { UserRepositoryPort, SessionData } from '../ports/user-repository';
import { User } from '../domain/types';

export class D1UserRepository implements UserRepositoryPort {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT id, username, password_hash, is_active, created_at FROM users WHERE id = ?')
      .bind(id)
      .first<{ id: string; username: string; password_hash: string; is_active: number; created_at: number }>();

    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db
      .prepare('SELECT id, username, password_hash, is_active, created_at FROM users WHERE username = ?')
      .bind(username)
      .first<{ id: string; username: string; password_hash: string; is_active: number; created_at: number }>();

    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  async create(user: User): Promise<void> {
    await this.db
      .prepare('INSERT INTO users (id, username, password_hash, is_active, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, user.username, user.passwordHash, user.isActive ? 1 : 0, user.createdAt)
      .run();
  }

  async createSession(session: SessionData): Promise<void> {
    await this.db
      .prepare('INSERT INTO sessions (id, user_id, current_role_id, expires_at) VALUES (?, ?, ?, ?)')
      .bind(session.sessionId, session.userId, session.currentRoleId, session.expiresAt)
      .run();
  }

  async findSession(sessionId: string): Promise<SessionData | null> {
    const row = await this.db
      .prepare('SELECT id, user_id, current_role_id, expires_at FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(sessionId, Date.now())
      .first<{ id: string; user_id: string; current_role_id: string; expires_at: number }>();

    if (!row) return null;
    return {
      sessionId: row.id,
      userId: row.user_id,
      currentRoleId: row.current_role_id,
      expiresAt: row.expires_at,
    };
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionId)
      .run();
  }

  async listAllUsers(): Promise<Array<{ id: string; username: string }>> {
    const { results } = await this.db
      .prepare('SELECT id, username FROM users WHERE is_active = 1 ORDER BY created_at ASC')
      .all<{ id: string; username: string }>();

    return results.map(u => ({ id: u.id, username: u.username }));
  }
}
