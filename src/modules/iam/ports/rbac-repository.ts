import { Privilege, Role, Grant } from '../domain/types';
import { InheritanceRule } from '../domain/rbac-engine';

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

export interface UserRoleAssignment {
  userId: string;
  username: string;
  roleId: string;
  roleName: string;
  grantedBy: string;
  grantedByName: string;
  grantedAt: number;
}

export interface RbacRepositoryPort {
  createRole(role: Role): Promise<void>;
  assignRoleToUser(userId: string, roleId: string, grantedBy: string): Promise<void>;
  revokeRoleFromUser(userId: string, roleId: string): Promise<void>;
  getUserRoleIds(userId: string): Promise<string[]>;
  getInheritanceRules(): Promise<InheritanceRule[]>;
  grantPrivilege(roleId: string, objectId: string, privilege: Privilege, grantedBy: string): Promise<void>;
  revokePrivilege(roleId: string, objectId: string, privilege: Privilege): Promise<void>;
  revokeGrantById(grantId: string): Promise<void>;
  listGrantsForObject(objectId: string): Promise<Grant[]>;
  getAllRolesWithUsers(): Promise<RoleDetail[]>;
  getAllGrantsMatrix(): Promise<GrantMatrixItem[]>;
  getAllUserRoleAssignments(): Promise<UserRoleAssignment[]>;
  diagnosePrivileges(userId: string, objectId: string): Promise<PrivilegeDiagnosis>;

  /**
   * 使用高效递归 CTE 直接在 D1/SQLite 执行 Snowflake 权限校验
   */
  hasPrivilege(userId: string, objectId: string, requiredPrivilege: Privilege): Promise<boolean>;
}
