-- D1 存储适配器所需的文件内容表 (替代需要信用卡的 R2 对象存储，100% 免费且无需信用卡)
CREATE TABLE IF NOT EXISTS file_contents (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
