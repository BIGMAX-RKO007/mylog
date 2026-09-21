-- 初始化普通用户系统角色
INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at)
VALUES ('rol_user', 'ROLE_USER', '标准普通注册用户角色', 1, 1700000000000);
