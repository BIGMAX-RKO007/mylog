-- 分类基表与关联迁移脚本
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 初始化默认与常用种子分类
INSERT OR IGNORE INTO categories (id, name, parent_id, order_index, created_at)
VALUES 
  ('cat_uncategorized', '未分类', NULL, 999, 1700000000000),
  ('cat_tech', '技术架构', NULL, 1, 1700000000000),
  ('cat_tech_backend', '后端与存储', 'cat_tech', 1, 1700000000000),
  ('cat_tech_frontend', '前端与交互', 'cat_tech', 2, 1700000000000),
  ('cat_notes', '读书笔记', NULL, 2, 1700000000000),
  ('cat_notes_thoughts', '方法与思考', 'cat_notes', 1, 1700000000000);

-- 在 files 表中增加 category_id 列
ALTER TABLE files ADD COLUMN category_id TEXT DEFAULT 'cat_uncategorized';

-- 将旧数据中可能为 NULL 的补全为未分类
UPDATE files SET category_id = 'cat_uncategorized' WHERE category_id IS NULL;

-- 索引支持
CREATE INDEX IF NOT EXISTS idx_files_category_id ON files(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
