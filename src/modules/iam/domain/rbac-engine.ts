import { Grant, Privilege } from './types';

export interface InheritanceRule {
  parentRoleId: string;
  childRoleId: string;
}

export class RbacEngine {
  /**
   * 计算用户的所有有效角色（直接角色 + 递归继承的子角色）
   * Snowflake 规则：如果 parent_role 继承自 child_role，则拥有 parent_role 的用户自动获得 child_role 的所有权限。
   */
  static resolveEffectiveRoles(
    directRoleIds: string[],
    inheritanceRules: InheritanceRule[]
  ): Set<string> {
    const effectiveRoles = new Set<string>(directRoleIds);
    let addedNewRole = true;

    // 广度优先遍历继承图，直到没有新角色被发现
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
   * 判定有效角色集合是否对目标对象具备指定特权
   * Snowflake 规则：
   * 1. 如果角色拥有目标对象的 OWNERSHIP 特权，则自动拥有 READ、WRITE、DELETE 全部操作权；
   * 2. 否则，角色必须被明确授予了所需的特权。
   */
  static evaluatePrivilege(
    effectiveRoleIds: Set<string>,
    grants: Grant[],
    targetObjectId: string,
    requiredPrivilege: Privilege,
    isObjectPublic = false
  ): boolean {
    // 针对公开对象的只读豁免 (对应 Snowflake 中将 READ 赋权给 PUBLIC 伪角色)
    if (isObjectPublic && requiredPrivilege === 'READ') {
      return true;
    }

    for (const grant of grants) {
      if (grant.objectId === targetObjectId && effectiveRoleIds.has(grant.roleId)) {
        // OWNERSHIP 特权天然包含一切操作
        if (grant.privilege === 'OWNERSHIP') {
          return true;
        }
        // 匹配到具体特权
        if (grant.privilege === requiredPrivilege) {
          return true;
        }
      }
    }

    return false;
  }
}
