import { User } from '../domain/types';

export interface SessionData {
  sessionId: string;
  userId: string;
  currentRoleId: string;
  expiresAt: number;
}

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(user: User): Promise<void>;
  createSession(session: SessionData): Promise<void>;
  findSession(sessionId: string): Promise<SessionData | null>;
  deleteSession(sessionId: string): Promise<void>;
  listAllUsers(): Promise<Array<{ id: string; username: string }>>;
}
