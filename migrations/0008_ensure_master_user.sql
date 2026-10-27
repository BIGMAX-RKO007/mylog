-- 确保系统核心角色与 usr_master 用户存在，满足 grants 与 securable_objects 的外键完整性约束
INSERT OR IGNORE INTO users (id, username, password_hash, is_active, created_at)
VALUES 
  ('usr_master', 'master', 'SYSTEM_LOCKED', 1, 1700000000000),
  ('usr_guest', 'guest', 'LOCKED', 1, 1700000000000);

INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at)
VALUES 
  ('rol_accountadmin', 'ACCOUNTADMIN', '系统顶级管理角色，拥有全局最高权限', 1, 1700000000000),
  ('rol_public', 'PUBLIC', '伪角色，代表匿名访客 (公开分享时赋予特权)', 1, 1700000000000);

INSERT OR IGNORE INTO user_roles (user_id, role_id, granted_at)
VALUES ('usr_master', 'rol_accountadmin', 1700000000000);
