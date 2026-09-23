import { describe, it, expect } from 'vitest';
import { RbacService, Privilege } from '../src/services/rbac-service';

describe('Snowflake RBAC Service Domain Tests', () => {
  it('应正确计算单层与多层角色继承', () => {
    // 继承关系: SuperAdmin -> TeamAdmin -> Member
    const inheritance = [
      { parentRoleId: 'rol_super', childRoleId: 'rol_team_lead' },
      { parentRoleId: 'rol_team_lead', childRoleId: 'rol_member' },
    ];

    const userRoles = ['rol_super'];
    const effectiveRoles = RbacService.resolveEffectiveRoles(userRoles, inheritance);

    expect(effectiveRoles.has('rol_super')).toBe(true);
    expect(effectiveRoles.has('rol_team_lead')).toBe(true);
    expect(effectiveRoles.has('rol_member')).toBe(true);
  });

  it('OWNERSHIP 特权应自动满足 READ, WRITE, DELETE 权限要求', () => {
    const grants: Array<{ roleId: string; objectId: string; privilege: Privilege }> = [
      { roleId: 'rol_user_alice', objectId: 'file_123', privilege: 'OWNERSHIP' },
    ];
    const roles = new Set(['rol_user_alice']);

    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'READ')).toBe(true);
    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'WRITE')).toBe(true);
    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'DELETE')).toBe(true);
  });

  it('仅有 READ 特权的角色不应获得 WRITE 或 DELETE 权限', () => {
    const grants: Array<{ roleId: string; objectId: string; privilege: Privilege }> = [
      { roleId: 'rol_guest', objectId: 'file_123', privilege: 'READ' },
    ];
    const roles = new Set(['rol_guest']);

    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'READ')).toBe(true);
    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'WRITE')).toBe(false);
    expect(RbacService.evaluatePrivilege(roles, grants, 'file_123', 'DELETE')).toBe(false);
  });

  it('公开对象对任何角色（即便没有任何授权）均满足 READ 要求', () => {
    const grants: Array<{ roleId: string; objectId: string; privilege: Privilege }> = [];
    const roles = new Set<string>();

    expect(RbacService.evaluatePrivilege(roles, grants, 'file_public_doc', 'READ', true)).toBe(true);
    expect(RbacService.evaluatePrivilege(roles, grants, 'file_public_doc', 'WRITE', true)).toBe(false);
  });

  it('父角色应能通过继承间接行使子角色被授予的权限', () => {
    const inheritance = [
      { parentRoleId: 'rol_manager', childRoleId: 'rol_editor' },
    ];
    const grants: Array<{ roleId: string; objectId: string; privilege: Privilege }> = [
      { roleId: 'rol_editor', objectId: 'file_report', privilege: 'WRITE' },
    ];

    // Manager 继承 Editor
    const effectiveRoles = RbacService.resolveEffectiveRoles(['rol_manager'], inheritance);
    expect(RbacService.evaluatePrivilege(effectiveRoles, grants, 'file_report', 'WRITE')).toBe(true);
  });
});
