import { FC } from 'hono/jsx';
import { Layout } from '../layout';
import { UserSession } from '../../../core/types';
import {
  RoleDetail,
  GrantMatrixItem,
  PrivilegeDiagnosis,
  UserRoleAssignment,
} from '../../../services/rbac-service';
import { DocumentMetadata } from '../../../services/document-service';

interface RbacDashboardProps {
  roles: RoleDetail[];
  grants: GrantMatrixItem[];
  userRoles: UserRoleAssignment[];
  users: Array<{ id: string; username: string }>;
  files: DocumentMetadata[];
  session: UserSession;
}

/**
 * 403 访问被拒绝视图（非管理员拦截页面）
 */
export const ForbiddenView: FC<{ session?: UserSession }> = ({ session }) => {
  return (
    <Layout title="403 拒绝访问 — mylog" session={session}>
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <div class="bento-auth-card" style="text-align: center; max-width: 480px;">
          <div style="font-size: 3.5rem; margin-bottom: 1rem; filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3));">
            🛡️
          </div>
          <span class="bento-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
            403 FORBIDDEN
          </span>
          <h1 style="font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--text-primary);">
            无权访问权限管理中心
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 2rem;">
            当前登录账号 <strong>{session?.username || '当前用户'}</strong> 属于普通用户身份，尚未被授予管理员角色 (ACCOUNTADMIN)。如需操作权限，请联系管理员为您分配角色。
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <a href="/" class="bento-submit-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; width: auto; padding: 0.75rem 1.5rem;">
              <span>返回知识库大厅</span>
            </a>
            <a href="/logout" class="reader-back-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem;">
              <span>切换其他账号</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

/**
 * 用户-角色分配表格组件 (独立组件，便于 HTMX 局部无刷新替换)
 */
export const UserRolesTable: FC<{
  userRoles: UserRoleAssignment[];
  currentUserId: string;
}> = ({ userRoles, currentUserId }) => {
  return (
    <div id="user-roles-container" class="rbac-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>已分配角色</th>
            <th>角色类别</th>
            <th>授权操作人</th>
            <th>授权时间</th>
            <th style="text-align: right;">角色操作</th>
          </tr>
        </thead>
        <tbody>
          {userRoles.length === 0 ? (
            <tr>
              <td colspan={6} style="text-align: center; color: var(--text-muted); padding: 3rem;">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">👥</div>
                <div>暂无用户角色分配记录</div>
              </td>
            </tr>
          ) : (
            userRoles.map((ur) => {
              const isSelfAdmin = ur.userId === currentUserId && ur.roleId === 'rol_accountadmin';
              const isPrivateRole = ur.roleId.startsWith('rol_user_');
              const isAdminRole = ur.roleId === 'rol_accountadmin';

              return (
                <tr key={`${ur.userId}-${ur.roleId}`}>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      <div class="avatar-ring" style="width: 26px; height: 26px; font-size: 0.75rem;">
                        {ur.username.slice(0, 1).toUpperCase()}
                      </div>
                      <strong>👤 {ur.username}</strong>
                    </div>
                  </td>
                  <td>
                    <span class={`badge ${isAdminRole ? 'badge-warning' : isPrivateRole ? 'badge-muted' : 'badge-primary'}`}>
                      {isAdminRole ? '👑' : isPrivateRole ? '🔒' : '🎭'} {ur.roleName}
                    </span>
                  </td>
                  <td>
                    {isAdminRole ? (
                      <span class="badge badge-warning">系统最高管理</span>
                    ) : isPrivateRole ? (
                      <span class="badge badge-muted">个人私有属主</span>
                    ) : (
                      <span class="badge badge-primary">系统功能角色</span>
                    )}
                  </td>
                  <td>
                    <span class="rbac-actor-tag">👤 {ur.grantedByName}</span>
                  </td>
                  <td class="rbac-time-cell">
                    {new Date(ur.grantedAt).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td style="text-align: right;">
                    {isPrivateRole ? (
                      <span class="badge badge-muted" title="私有角色用于管理个人专属文档，系统自动维持">私有保护</span>
                    ) : isSelfAdmin ? (
                      <span class="badge badge-muted" title="不能撤销自己的系统管理员角色">当前自管</span>
                    ) : (
                      <button
                        class="btn-revoke-pill"
                        hx-post="/admin/rbac/user-role/revoke"
                        hx-vals={JSON.stringify({ userId: ur.userId, roleId: ur.roleId })}
                        hx-target="#user-roles-container"
                        hx-swap="outerHTML"
                        hx-confirm={`确定要收回用户 ${ur.username} 的 ${ur.roleName} 角色吗？`}
                      >
                        收回角色
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 授权矩阵表格组件 (独立组件，便于 HTMX 局部无刷新替换)
 */
export const GrantsTable: FC<{ grants: GrantMatrixItem[] }> = ({ grants }) => {
  return (
    <div id="grants-matrix-container" class="rbac-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>目标文档</th>
            <th>被授权角色</th>
            <th>特权类型</th>
            <th>授权操作人</th>
            <th>授权时间</th>
            <th style="text-align: right;">特权操作</th>
          </tr>
        </thead>
        <tbody>
          {grants.length === 0 ? (
            <tr>
              <td colspan={6} style="text-align: center; color: var(--text-muted); padding: 3rem;">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🍃</div>
                <div>当前知识库暂无显式特权授予记录</div>
              </td>
            </tr>
          ) : (
            grants.map((grant) => {
              const isOwner = grant.privilege === 'OWNERSHIP';
              let badgeClass = 'badge-primary';
              let badgeIcon = '📖';

              if (isOwner) {
                badgeClass = 'badge-warning';
                badgeIcon = '👑';
              } else if (grant.privilege === 'WRITE') {
                badgeClass = 'badge-success';
                badgeIcon = '✍️';
              } else if (grant.privilege === 'DELETE') {
                badgeClass = 'badge-danger';
                badgeIcon = '🗑️';
              }

              return (
                <tr key={grant.id}>
                  <td>
                    <div class="rbac-cell-title">{grant.fileTitle || grant.fileName}</div>
                    <div class="rbac-cell-sub">{grant.objectId}</div>
                  </td>
                  <td>
                    <span class="badge badge-muted">
                      🎭 {grant.roleName}
                    </span>
                  </td>
                  <td>
                    <span class={`badge ${badgeClass}`}>
                      {badgeIcon} {grant.privilege}
                    </span>
                  </td>
                  <td>
                    <span class="rbac-actor-tag">👤 {grant.grantedByName}</span>
                  </td>
                  <td class="rbac-time-cell">
                    {new Date(grant.grantedAt).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td style="text-align: right;">
                    {isOwner ? (
                      <span class="badge badge-muted" title="所有权不可通过普通撤销解除">所有权保护</span>
                    ) : (
                      <button
                        class="btn-revoke-pill"
                        hx-post="/admin/rbac/revoke"
                        hx-vals={JSON.stringify({ grantId: grant.id })}
                        hx-target="#grants-matrix-container"
                        hx-swap="outerHTML"
                        hx-confirm="确定要撤销对此角色的特权授权吗？"
                      >
                        撤销特权
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 权限诊断测试结果组件
 */
export const DiagnosticResult: FC<{
  diagnosis?: PrivilegeDiagnosis;
  targetUsername?: string;
  targetFileTitle?: string;
  error?: string;
}> = ({ diagnosis, targetUsername, targetFileTitle, error }) => {
  if (error) {
    return (
      <div class="auth-error-banner">
        ⚠️ {error}
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div class="diagnostic-empty-box">
        👈 在左侧选择用户与文档，点击「执行诊断」即刻求值实时生效特权
      </div>
    );
  }

  return (
    <div class="diagnostic-active-box">
      <div class="diagnostic-header-bar">
        <div class="diagnostic-subject-line">
          主体：<strong>👤 {targetUsername}</strong> ➔ 目标：<strong>📄 {targetFileTitle}</strong>
        </div>
        <div class="diagnostic-roles-row">
          <span class="role-group-title">直接分配角色:</span>
          {diagnosis.directRoleNames.map((name) => (
            <span class="badge badge-muted" key={name}>🎭 {name}</span>
          ))}
          {diagnosis.inheritedRoleNames.length > 0 && (
            <>
              <span class="role-group-title" style="margin-left: 0.5rem;">继承有效角色:</span>
              {diagnosis.inheritedRoleNames.map((name) => (
                <span class="badge badge-primary" key={name}>🧬 {name}</span>
              ))}
            </>
          )}
        </div>
      </div>

      <div class="diagnostic-metrics-grid">
        {/* READ */}
        <div class={`metric-quad-card ${diagnosis.canRead ? 'granted' : 'denied'}`}>
          <span class="metric-title">只读 (READ)</span>
          <div class="metric-val">{diagnosis.canRead ? '✅ 允许' : '❌ 拒绝'}</div>
          {diagnosis.isPublic && <span class="metric-sub-tip">公开文档自动只读</span>}
        </div>

        {/* WRITE */}
        <div class={`metric-quad-card ${diagnosis.canWrite ? 'granted' : 'denied'}`}>
          <span class="metric-title">编辑 (WRITE)</span>
          <div class="metric-val">{diagnosis.canWrite ? '✅ 允许' : '❌ 拒绝'}</div>
        </div>

        {/* DELETE */}
        <div class={`metric-quad-card ${diagnosis.canDelete ? 'granted' : 'denied'}`}>
          <span class="metric-title">删除 (DELETE)</span>
          <div class="metric-val">{diagnosis.canDelete ? '✅ 允许' : '❌ 拒绝'}</div>
        </div>

        {/* OWNERSHIP */}
        <div class={`metric-quad-card ${diagnosis.isOwner ? 'owner' : 'denied'}`}>
          <span class="metric-title">所有权 (OWNERSHIP)</span>
          <div class="metric-val">{diagnosis.isOwner ? '👑 属主' : '⚪ 非属主'}</div>
        </div>
      </div>
    </div>
  );
};

export const RbacDashboardView: FC<RbacDashboardProps> = ({
  roles,
  grants,
  userRoles,
  users,
  files,
  session,
}) => {
  return (
    <Layout title="Snowflake RBAC 权限管理中心 — mylog" session={session}>
      <div class="rbac-page-stage">
        {/* 顶部悬浮控制条 */}
        <div class="rbac-top-header">
          <div class="rbac-header-left">
            <a href="/" class="brand-link">
              <svg class="brand-flame-svg" viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2C10.5 4.5 9 6.8 9 9.5C9 12.8 11.2 14.5 12 15C12.8 14.5 15 12.8 15 9.5C15 6.8 13.5 4.5 12 2Z"
                  fill="#f97316"
                />
                <path
                  d="M12 22C6.5 22 3 17.5 3 12.5C3 8.2 6.2 5.1 8 3.5C8.3 4.8 8.9 6.2 9.8 7.3C10.8 8.5 12.1 9.4 12.5 11C13.2 9.8 13.8 8.4 14 7C16.5 9.2 19 12.2 19 15.5C19 19.5 16 22 12 22Z"
                  stroke="#0ea5e9"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="brand-name">mylog</span>
              <span class="bento-badge">RBAC Core</span>
            </a>
            <div class="rbac-header-titles">
              <h1 class="rbac-main-title">Snowflake 权限管理中心</h1>
              <p class="rbac-main-desc">
                基于 Snowflake RBAC 授权矩阵，支持角色继承、用户角色分配与细粒度访问控制
              </p>
            </div>
          </div>

          <div class="rbac-header-right">
            <a href="/" class="reader-back-btn">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>返回知识库大厅</span>
            </a>
          </div>
        </div>

        {/* 主体 Bento 网格容器 */}
        <div class="rbac-bento-container">
          {/* 上半部双列 Bento：特权授予 + 实时诊断 */}
          <div class="rbac-bento-grid-2">
            {/* 卡片 1: 快速特权授予 */}
            <div class="rbac-card">
              <div class="rbac-card-header">
                <div class="rbac-card-title-group">
                  <span class="rbac-card-icon">⚡</span>
                  <h2 class="rbac-card-title">文档特权授予 (GRANT TO ROLE)</h2>
                </div>
                <span class="rbac-pill-tag">实时写入</span>
              </div>
              <form
                hx-post="/admin/rbac/grant"
                hx-target="#grants-matrix-container"
                hx-swap="outerHTML"
                class="rbac-form"
              >
                <div class="auth-form-group">
                  <label class="auth-form-label">选择目标文档：</label>
                  <select name="objectId" class="rbac-select" required>
                    <option value="" disabled selected>-- 请选择文档 --</option>
                    {files.map((file) => (
                      <option value={file.id} key={file.id}>
                        {file.title || file.name} ({file.id.slice(0, 10)})
                      </option>
                    ))}
                  </select>
                </div>

                <div class="rbac-form-row">
                  <div class="auth-form-group" style="flex: 1;">
                    <label class="auth-form-label">授予角色 (ROLE)：</label>
                    <select name="roleId" class="rbac-select" required>
                      <option value="" disabled selected>-- 选择角色 --</option>
                      {roles.map((role) => (
                        <option value={role.id} key={role.id}>
                          {role.name} {role.isSystem ? '⭐' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="auth-form-group" style="flex: 1;">
                    <label class="auth-form-label">特权类型 (PRIVILEGE)：</label>
                    <select name="privilege" class="rbac-select" required>
                      <option value="READ">📖 READ (只读)</option>
                      <option value="WRITE">✍️ WRITE (编辑)</option>
                      <option value="DELETE">🗑️ DELETE (删除)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" class="bento-submit-btn" style="margin-top: 0.5rem;">
                  <span>赋予此特权</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>
            </div>

            {/* 卡片 2: 实时特权推导诊断器 */}
            <div class="rbac-card">
              <div class="rbac-card-header">
                <div class="rbac-card-title-group">
                  <span class="rbac-card-icon">🧪</span>
                  <h2 class="rbac-card-title">特权推导模拟器 (Privilege Simulator)</h2>
                </div>
                <span class="rbac-pill-tag">CTE 递归求值</span>
              </div>

              <form
                hx-post="/admin/rbac/test"
                hx-target="#diagnostic-result-container"
                hx-swap="innerHTML"
                class="rbac-form"
              >
                <div class="rbac-form-row">
                  <div class="auth-form-group" style="flex: 1;">
                    <label class="auth-form-label">模拟用户：</label>
                    <select name="userId" class="rbac-select" required>
                      <option value="" disabled selected>-- 选择用户 --</option>
                      {users.map((u) => (
                        <option value={u.id} key={u.id}>
                          👤 {u.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="auth-form-group" style="flex: 1;">
                    <label class="auth-form-label">测试目标文档：</label>
                    <select name="objectId" class="rbac-select" required>
                      <option value="" disabled selected>-- 选择文档 --</option>
                      {files.map((f) => (
                        <option value={f.id} key={f.id}>
                          📄 {f.title || f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" class="diagnostic-run-btn">
                  <span>执行权限推导诊断</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              </form>

              <div id="diagnostic-result-wrapper" style="margin-top: 1.25rem;">
                <DiagnosticResult />
              </div>
            </div>
          </div>

          {/* 卡片 3: 用户角色分配管理 (GRANT ROLE TO USER) */}
          <div class="rbac-card">
            <div class="rbac-card-header">
              <div class="rbac-card-title-group">
                <span class="rbac-card-icon">👑</span>
                <h2 class="rbac-card-title">用户角色分配 (GRANT ROLE TO USER)</h2>
              </div>
              <span class="rbac-pill-tag">分配后即刻生效</span>
            </div>

            {/* 快速角色分配表单 */}
            <form
              hx-post="/admin/rbac/user-role/assign"
              hx-target="#user-roles-container"
              hx-swap="outerHTML"
              class="rbac-form"
              style="margin-bottom: 1.5rem; background: var(--bg-hover); padding: 1rem 1.25rem; border-radius: 12px; border: 1px solid var(--border-subtle);"
            >
              <div class="rbac-form-row" style="align-items: flex-end;">
                <div class="auth-form-group" style="flex: 1.2;">
                  <label class="auth-form-label">选择目标用户：</label>
                  <select name="userId" class="rbac-select" required>
                    <option value="" disabled selected>-- 选择用户 --</option>
                    {users.map((u) => (
                      <option value={u.id} key={u.id}>
                        👤 {u.username} ({u.id.slice(0, 10)})
                      </option>
                    ))}
                  </select>
                </div>

                <div class="auth-form-group" style="flex: 1.2;">
                  <label class="auth-form-label">授予角色：</label>
                  <select name="roleId" class="rbac-select" required>
                    <option value="" disabled selected>-- 选择要赋予的角色 --</option>
                    {roles.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name === 'ACCOUNTADMIN' ? '👑 ACCOUNTADMIN (系统超级管理员)' : r.name === 'ROLE_USER' ? '👤 ROLE_USER (普通用户)' : `🎭 ${r.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div style="flex: 0.8;">
                  <button type="submit" class="bento-submit-btn" style="margin-top: 0; padding: 0.65rem 1.25rem;">
                    <span>确认授予该角色</span>
                  </button>
                </div>
              </div>
            </form>

            <UserRolesTable userRoles={userRoles} currentUserId={session.userId} />
          </div>

          {/* 卡片 4: 特权授权矩阵 */}
          <div class="rbac-card">
            <div class="rbac-card-header">
              <div class="rbac-card-title-group">
                <span class="rbac-card-icon">📋</span>
                <h2 class="rbac-card-title">特权授权矩阵 (Grants Matrix)</h2>
              </div>
              <span class="rbac-pill-tag">共 {grants.length} 条有效授权</span>
            </div>
            <GrantsTable grants={grants} />
          </div>

          {/* 卡片 4: 角色与网络拓扑 */}
          <div class="rbac-card">
            <div class="rbac-card-header">
              <div class="rbac-card-title-group">
                <span class="rbac-card-icon">👥</span>
                <h2 class="rbac-card-title">角色与成员体系 (Roles & Users)</h2>
              </div>
              <span class="rbac-pill-tag">共 {roles.length} 个角色定义</span>
            </div>
            <div class="rbac-table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>角色名称</th>
                    <th>角色类型</th>
                    <th>职责描述</th>
                    <th>关联用户列表</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <span class="rbac-role-name">🎭 {role.name}</span>
                      </td>
                      <td>
                        {role.isSystem ? (
                          <span class="badge badge-primary">系统内置</span>
                        ) : (
                          <span class="badge badge-muted">用户专属</span>
                        )}
                      </td>
                      <td class="rbac-desc-cell">
                        {role.description || '-'}
                      </td>
                      <td>
                        {role.usernames.length > 0 ? (
                          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                            {role.usernames.map((u) => (
                              <span class="badge badge-muted" key={u}>
                                👤 {u}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style="color: var(--text-muted); font-size: 0.8rem;">(暂无绑定成员)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
