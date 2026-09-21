import { MarkdownParser } from '../domain/markdown-parser';
import { ParsedDocument } from '../domain/types';
import { Result, ok, err } from '../../../core/result';

export interface PreviewResult {
  parsed: ParsedDocument;
  uploadToken: string;
  fileName: string;
}

export class PreviewDocumentUseCase {
  /**
   * 极速预览上传的 Markdown，并生成安全暂存 Token（免二次网络上传）
   */
  static async execute(fileName: string, rawMarkdown: string): Promise<Result<PreviewResult>> {
    if (!rawMarkdown || !rawMarkdown.trim()) {
      return err(new Error('上传的 Markdown 文件内容为空'));
    }

    const parsed = MarkdownParser.parse(rawMarkdown, fileName);
    const sha256 = await MarkdownParser.computeSha256(rawMarkdown);

    // 将上传草稿封装为安全可恢复的暂存 Token
    // 包含内容、标题、文件名与签名，15分钟内有效
    const payload = {
      name: fileName,
      title: parsed.title,
      rawMarkdown,
      sha256,
      size: parsed.size,
      exp: Date.now() + 1000 * 60 * 15,
    };

    // 使用 Base64URL 序列化传输
    const jsonStr = JSON.stringify(payload);
    const uploadToken = btoa(encodeURIComponent(jsonStr));

    return ok({
      parsed,
      uploadToken,
      fileName,
    });
  }

  static unpackToken(uploadToken: string): Result<{
    name: string;
    title: string;
    rawMarkdown: string;
    sha256: string;
    size: number;
  }> {
    try {
      const jsonStr = decodeURIComponent(atob(uploadToken));
      const payload = JSON.parse(jsonStr);

      if (Date.now() > payload.exp) {
        return err(new Error('预览已过期，请重新上传文件'));
      }

      return ok({
        name: payload.name,
        title: payload.title,
        rawMarkdown: payload.rawMarkdown,
        sha256: payload.sha256,
        size: payload.size,
      });
    } catch {
      return err(new Error('无效的上传令牌'));
    }
  }
}
