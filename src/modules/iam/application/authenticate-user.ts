import { UserRepositoryPort } from '../ports/user-repository';
import { RbacRepositoryPort } from '../ports/rbac-repository';
import { PasswordHasher } from '../infrastructure/password-hasher';
import { Result, ok, err } from '../../../core/result';
import { UserSession } from '../../../core/types';

export class AuthenticateUserUseCase {
  constructor(
    private userRepo: UserRepositoryPort,
    private rbacRepo: RbacRepositoryPort
  ) {}

  async register(username: string, password: string): Promise<Result<{ sessionToken: string; session: UserSession }>> {
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return err(new Error('用户名至少需要 3 个字符'));
    }
    if (!password || password.length < 6) {
      return err(new Error('密码至少需要 6 个字符'));
    }

    const existingUser = await this.userRepo.findByUsername(trimmedUsername);
    if (existingUser) {
      return err(new Error('该用户名已被占用'));
    }

    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const passwordHash = await PasswordHasher.hash(password);
    const now = Date.now();

    // 1. 创建用户
    await this.userRepo.create({
      id: userId,
      username: trimmedUsername,
      passwordHash,
      isActive: true,
      createdAt: now,
    });

    // 2. 为新用户创建专有的私有角色 (Snowflake 模式: 用户通过私有角色持有个人对象所有权)
    const privateRoleId = `rol_user_${userId.slice(4)}`;
    await this.rbacRepo.createRole({
      id: privateRoleId,
      name: `ROLE_${trimmedUsername.toUpperCase()}`,
      description: `User ${trimmedUsername}'s private ownership role`,
      isSystem: false,
      createdAt: now,
    });

    // 3. 将私有角色与标准普通用户角色授予该用户
    await this.rbacRepo.assignRoleToUser(userId, privateRoleId, 'SYSTEM');
    await this.rbacRepo.assignRoleToUser(userId, 'rol_user', 'SYSTEM');

    // 4. 创建登录会话
    const sessionToken = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7; // 7 天有效

    await this.userRepo.createSession({
      sessionId: sessionToken,
      userId,
      currentRoleId: privateRoleId,
      expiresAt,
    });

    return ok({
      sessionToken,
      session: {
        userId,
        username: trimmedUsername,
        currentRoleId: privateRoleId,
        roles: [privateRoleId, 'rol_user'],
      },
    });
  }

  async login(username: string, password: string): Promise<Result<{ sessionToken: string; session: UserSession }>> {
    const trimmedUsername = username.trim().toLowerCase();
    const user = await this.userRepo.findByUsername(trimmedUsername);
    if (!user || !user.isActive) {
      return err(new Error('用户名或密码错误'));
    }

    const validPassword = await PasswordHasher.verify(password, user.passwordHash);
    if (!validPassword) {
      return err(new Error('用户名或密码错误'));
    }

    const roleIds = await this.rbacRepo.getUserRoleIds(user.id);
    const currentRoleId = roleIds[0] || 'rol_public';

    const sessionToken = `ses_${crypto.randomUUID().replace(/-/g, '')}`;
    const now = Date.now();
    const expiresAt = now + 1000 * 60 * 60 * 24 * 7; // 7 天

    await this.userRepo.createSession({
      sessionId: sessionToken,
      userId: user.id,
      currentRoleId,
      expiresAt,
    });

    return ok({
      sessionToken,
      session: {
        userId: user.id,
        username: user.username,
        currentRoleId,
        roles: roleIds,
      },
    });
  }

  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const sessionData = await this.userRepo.findSession(sessionToken);
    if (!sessionData) return null;

    const user = await this.userRepo.findById(sessionData.userId);
    if (!user || !user.isActive) return null;

    const roleIds = await this.rbacRepo.getUserRoleIds(user.id);

    return {
      userId: user.id,
      username: user.username,
      currentRoleId: sessionData.currentRoleId,
      roles: roleIds,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.userRepo.deleteSession(sessionToken);
  }
}
