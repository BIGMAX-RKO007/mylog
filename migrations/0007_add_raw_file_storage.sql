-- 给 file_contents 增加 raw_data 字段，用于支持网盘原文件（如 PPTX, PDF, Word, 二进制）的原样存储与下载
ALTER TABLE file_contents ADD COLUMN raw_data BLOB;
