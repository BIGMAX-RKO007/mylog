import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentConverter } from '../src/services/document-converter';
import { DocumentService } from '../src/services/document-service';
import { createMasterSessionToken, verifyMasterSessionToken } from '../src/web/middleware/edge-auth-guard';
import JSZip from 'jszip';

// 简易内存模拟 D1 驱动用于单元与业务逻辑验证
class MockD1Database {
  private fileContents = new Map<string, { content: string; raw_data: any; updated_at: number }>();
  private files = new Map<string, any>();
  private tags = new Map<string, any>();
  private fileTags = new Set<string>();

  prepare(query: string) {
    const db = this;
    return {
      bind(...params: any[]) {
        return {
          async first<T = any>() {
            if (query.includes('FROM file_contents WHERE key = ?')) {
              const row = db.fileContents.get(params[0]);
              return (row || null) as T;
            }
            if (query.includes('FROM files') && query.includes('WHERE f.id = ?')) {
              const f = db.files.get(params[0]);
              return (f || null) as T;
            }
            if (query.includes('SELECT id FROM tags WHERE name = ?')) {
              const t = db.tags.get(params[0]);
              return (t || null) as T;
            }
            return null as T;
          },
          async all<T = any>() {
            if (query.includes('FROM tags t')) {
              return { results: Array.from(db.tags.values()) as T[] };
            }
            if (query.includes('FROM files f')) {
              let list = Array.from(db.files.values());
              if (!query.includes('1=1')) {
                list = list.filter((f) => f.is_public === 1);
              }
              return { results: list as T[] };
            }
            return { results: [] as T[] };
          },
          async run() {
            if (query.includes('INSERT INTO file_contents')) {
              // 模拟 Cloudflare D1 真实行为：BLOB 列读取时返回为 number[] 数组
              const rawData = params[2] instanceof ArrayBuffer
                ? Array.from(new Uint8Array(params[2]))
                : (ArrayBuffer.isView(params[2]) ? Array.from(new Uint8Array(params[2].buffer)) : params[2]);
              db.fileContents.set(params[0], {
                content: params[1],
                raw_data: rawData,
                updated_at: params[3],
              });
            }
            if (query.includes('INSERT INTO files')) {
              db.files.set(params[0], {
                id: params[0],
                name: params[1],
                title: params[2],
                size: params[3],
                r2_key: params[4],
                sha256: params[5],
                is_public: params[6],
                views: 0,
                created_at: params[8],
                updated_at: params[9],
              });
            }
            if (query.includes('DELETE FROM files') || query.includes('DELETE FROM securable_objects')) {
              db.files.delete(params[0]);
            }
            if (query.includes('DELETE FROM file_contents')) {
              db.fileContents.delete(params[0]);
            }
            return { success: true };
          },
        };
      },
    };
  }
}

describe('Stealth Mode & Personal Cloud Drive Integration', () => {
  const MASTER_KEY = 'my-super-secret-master-key';
  let mockDb: MockD1Database;
  let docService: DocumentService;

  beforeEach(() => {
    mockDb = new MockD1Database();
    docService = new DocumentService(mockDb as any);
  });

  it('should issue and verify Master Session Token correctly', async () => {
    const token = await createMasterSessionToken(MASTER_KEY);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    const isValid = await verifyMasterSessionToken(token, MASTER_KEY);
    expect(isValid).toBe(true);

    const isWrongKey = await verifyMasterSessionToken(token, 'wrong-key');
    expect(isWrongKey).toBe(false);
  });

  it('should upload PPTX file, extract outline, store raw binary and download faithfully', async () => {
    // 1. 模拟生成一个真实的 .pptx 文件
    const zip = new JSZip();
    const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>个人网盘架构设计演进</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
      </p:sld>`;
    zip.file('ppt/slides/slide1.xml', slideXml);
    const pptxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // 2. 转换并暂存
    const md = await DocumentConverter.convertToMarkdown('cloud-design.pptx', pptxBuffer);
    expect(md).toContain('PowerPoint 演示文稿大纲');
    expect(md).toContain('个人网盘架构设计演进');

    const preview = await docService.previewUpload('cloud-design.pptx', md, pptxBuffer);
    expect(preview.uploadToken).toBeDefined();

    // 3. 提交入库
    const meta = await docService.commitDocument(preview.uploadToken, 'rol_accountadmin', 'usr_master', false);
    expect(meta.name).toBe('cloud-design.pptx');
    expect(meta.isPublic).toBe(false);

    // 4. 原样下载验证：Master 下载获取原始二进制
    const rawFile = await docService.getRawFile(meta.id, true);
    expect(rawFile.name).toBe('cloud-design.pptx');
    expect(rawFile.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(rawFile.buffer.byteLength).toBe(pptxBuffer.byteLength);

    // 5. 权限隔离验证：未授权访客不可下载私有文件
    await expect(docService.getRawFile(meta.id, false)).rejects.toThrow('无权下载该私有文件');
  });

  it('should support general binary file in personal cloud drive mode', async () => {
    const rawBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]); // zip header
    const zipBuffer = rawBytes.buffer;

    const md = await DocumentConverter.convertToMarkdown('backup.zip', zipBuffer);
    expect(md).toContain('个人网盘压缩包资产');
    expect(md).toContain('backup.zip');

    const preview = await docService.previewUpload('backup.zip', md, zipBuffer);
    const meta = await docService.commitDocument(preview.uploadToken, 'rol_accountadmin', 'usr_master', false);

    const downloaded = await docService.getRawFile(meta.id, true);
    expect(downloaded.name).toBe('backup.zip');
    expect(downloaded.mimeType).toBe('application/zip');
    expect(new Uint8Array(downloaded.buffer)[0]).toBe(0x50);
  });

  it('should ensure Excel .xlsx files are downloaded as valid binary spreadsheets, not markdown text', async () => {
    // 构造一个真实的 xlsx 格式二进制 (PK\x03\x04 zip 容器)
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
    zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"></workbook>');
    const xlsxBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // 1. 转为预览 Markdown
    const md = await DocumentConverter.convertToMarkdown('finance.xlsx', xlsxBuffer);
    const preview = await docService.previewUpload('finance.xlsx', md, xlsxBuffer);
    expect(preview.uploadToken).toBeDefined();

    // 2. 存入 D1 (底层会将 BLOB 反序列化为 number[] 数组)
    const meta = await docService.commitDocument(preview.uploadToken, 'rol_accountadmin', 'usr_master', false);

    // 3. 原件下载
    const downloaded = await docService.getRawFile(meta.id, true);
    expect(downloaded.name).toBe('finance.xlsx');
    expect(downloaded.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // 4. 关键断言：下载出来的数据必须是 ArrayBuffer 且头部必须是标准 PK\x03\x04，绝不是 Markdown # 字符 (0x23)
    const firstFourBytes = Array.from(new Uint8Array(downloaded.buffer).slice(0, 4));
    expect(firstFourBytes).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(downloaded.buffer.byteLength).toBe(xlsxBuffer.byteLength);
  });
});
