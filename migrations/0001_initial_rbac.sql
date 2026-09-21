-- Snowflake 风格 RBAC / DAC 核心数据架构迁移

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 2. 角色表 (特权的唯一承载体)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 3. 用户-角色映射 (GRANT ROLE <role> TO USER <user>)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 4. 角色继承关系表 (GRANT ROLE <child> TO ROLE <parent>)
CREATE TABLE IF NOT EXISTS role_inheritance (
  parent_role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  child_role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (parent_role_id, child_role_id)
);

-- 5. 可安全对象基表
CREATE TABLE IF NOT EXISTS securable_objects (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,
  owner_role_id TEXT NOT NULL REFERENCES roles(id),
  created_at INTEGER NOT NULL
);

-- 6. Markdown 文件表 (与 securable_objects 1对1)
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY REFERENCES securable_objects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  size INTEGER NOT NULL,
  r2_key TEXT UNIQUE NOT NULL,
  sha256 TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 7. 特权授权表 (GRANT <privilege> ON <object> TO ROLE <role>)
CREATE TABLE IF NOT EXISTS grants (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL REFERENCES securable_objects(id) ON DELETE CASCADE,
  privilege TEXT NOT NULL,
  granted_by TEXT NOT NULL REFERENCES users(id),
  granted_at INTEGER NOT NULL
);

-- 8. 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_role_id TEXT REFERENCES roles(id),
  expires_at INTEGER NOT NULL
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public);
CREATE INDEX IF NOT EXISTS idx_grants_lookup ON grants(role_id, object_id, privilege);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 初始化系统内置角色与系统用户
INSERT OR IGNORE INTO users (id, username, password_hash, is_active, created_at)
VALUES ('usr_guest', 'guest', 'LOCKED', 1, 1700000000000);

INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at)
VALUES 
  ('rol_accountadmin', 'ACCOUNTADMIN', '系统顶级管理角色，拥有全局最高权限', 1, 1700000000000),
  ('rol_public', 'PUBLIC', '伪角色，代表匿名访客 (公开分享时赋予特权)', 1, 1700000000000);
