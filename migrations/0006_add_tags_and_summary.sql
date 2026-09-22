-- 1. files 表增加 AI 一句话摘要字段
ALTER TABLE files ADD COLUMN ai_summary TEXT;

-- 2. 标签字典表 (支持别名重定向与引用热度计数)
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    canonical_id TEXT,               -- 指向权威主标签 ID (若为空表示本身即为主标签)
    usage_count INTEGER DEFAULT 0,   -- 引用计数 (用于防膨胀与热门排序)
    created_at INTEGER NOT NULL
);

-- 3. 文件与标签的 N:N 多对多关联表
CREATE TABLE IF NOT EXISTS file_tags (
    file_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (file_id, tag_id),
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
