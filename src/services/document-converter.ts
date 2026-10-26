import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export class DocumentConverter {
  /**
   * 支持的文件后缀集合（包含 Office、演示文稿、常见数据、代码以及网盘常见包格式）
   */
  public static readonly SUPPORTED_EXTENSIONS = [
    // Markdown
    'md', 'markdown',
    // 演示文稿
    'pptx', 'ppt',
    // Office 与 文档
    'docx', 'xlsx', 'pdf',
    // 结构化与表格数据
    'csv', 'json', 'yaml', 'yml', 'xml', 'toml',
    // 纯文本与日志
    'txt', 'log', 'ini', 'env',
    // 常见压缩包与网盘文件
    'zip', 'rar', '7z', 'tar', 'gz',
    // 常用编程代码
    'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'sql',
    'sh', 'bash', 'ps1', 'java', 'go', 'rs', 'c', 'cpp', 'php', 'rb'
  ];

  /**
   * 判断文件是否支持
   */
  public static isSupported(fileName: string): boolean {
    return true; // 网盘模式：全面允许上传任意文件
  }

  /**
   * 获取小写文件扩展名（不带点）
   */
  public static getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.slice(lastDot + 1).toLowerCase().trim();
  }

  /**
   * 将各类文件格式转换为统一的标准 Markdown 文本（网盘预览与语义理解底座）
   */
  public static async convertToMarkdown(fileName: string, buffer: ArrayBuffer): Promise<string> {
    const ext = this.getExtension(fileName);
    const baseName = fileName.replace(/\.[^/.]+$/, '');

    switch (ext) {
      case 'md':
      case 'markdown': {
        const text = new TextDecoder('utf-8').decode(buffer);
        return text;
      }

      case 'pptx': {
        return await this.convertPptx(baseName, buffer);
      }

      case 'ppt': {
        return this.convertPpt(baseName, buffer);
      }

      case 'docx': {
        return await this.convertDocx(baseName, buffer);
      }

      case 'xlsx': {
        return this.convertXlsx(baseName, buffer);
      }

      case 'pdf': {
        return await this.convertPdf(baseName, buffer);
      }

      case 'csv': {
        const text = new TextDecoder('utf-8').decode(buffer);
        return this.convertCsv(baseName, text);
      }

      case 'json': {
        const text = new TextDecoder('utf-8').decode(buffer);
        return this.convertJson(baseName, text);
      }

      case 'txt':
      case 'log': {
        const text = new TextDecoder('utf-8').decode(buffer);
        return this.convertPlainText(baseName, text);
      }

      // 代码与标记语言
      case 'py':
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'sql':
      case 'sh':
      case 'bash':
      case 'ps1':
      case 'java':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'php':
      case 'rb':
      case 'yaml':
      case 'yml':
      case 'xml':
      case 'toml':
      case 'ini':
      case 'env': {
        const text = new TextDecoder('utf-8').decode(buffer);
        return this.convertCode(baseName, ext, text);
      }

      // 常见压缩包与网盘归档
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz': {
        const sizeKb = (buffer.byteLength / 1024).toFixed(1);
        return (
          `# 📦 ${fileName}\n\n` +
          `> 💾 **个人网盘压缩包资产** (格式: \`.${ext}\` | 大小: ${sizeKb} KB)\n\n` +
          `本压缩包已安全归档至您的私有网盘。您可以随时在上方或右侧点击 **【下载原文件】** 获取完整二进制数据。`
        );
      }

      default: {
        // 尝试作为文本解码，若失败则生成友好的个人网盘通用二进制文件预览卡片
        try {
          const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer);
          return this.convertPlainText(baseName, text);
        } catch {
          const sizeKb = (buffer.byteLength / 1024).toFixed(1);
          return (
            `# 📦 ${fileName}\n\n` +
            `> 💾 **个人网盘文件** (格式: \`.${ext || 'bin'}\` | 大小: ${sizeKb} KB)\n\n` +
            `本文件已安全存储至您的个人网盘中。您可以随时在上方或卡片右侧点击 **【下载原文件】** 获取完整二进制文件。`
          );
        }
      }
    }
  }

  /**
   * 将 Word .docx 转换为 Markdown
   */
  private static async convertDocx(baseName: string, buffer: ArrayBuffer): Promise<string> {
    try {
      // mammoth 支持 Buffer 或 ArrayBuffer
      const result = await (mammoth as any).convertToMarkdown({
        arrayBuffer: buffer,
      });

      let md = result.value ? result.value.trim() : '';
      if (!md) {
        throw new Error('Word 文档中未提取到有效文本内容');
      }

      // 如果转换出来的 Markdown 首部没有一级标题，补充文档名作为大标题
      if (!md.startsWith('# ')) {
        md = `# ${baseName}\n\n${md}`;
      }

      return md;
    } catch (err: any) {
      throw new Error(`Word (.docx) 解析失败: ${err.message || String(err)}`);
    }
  }

  /**
   * 将 CSV 转换为标准 Markdown 表格
   */
  private static convertCsv(baseName: string, csvText: string): string {
    const rawLines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) {
      return `# ${baseName}\n\n*(空表格文件)*`;
    }

    // 简单解析 CSV 行（处理逗号分隔和基础引号）
    const parseLine = (line: string): string[] => {
      const entries: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          entries.push(current.trim().replace(/^["']|["']$/g, '').replace(/\|/g, '\\|'));
          current = '';
        } else {
          current += char;
        }
      }
      entries.push(current.trim().replace(/^["']|["']$/g, '').replace(/\|/g, '\\|'));
      return entries;
    };

    const rows = rawLines.map(parseLine);
    if (rows.length === 0) {
      return `# ${baseName}\n\n*(空表格文件)*`;
    }

    const header = rows[0];
    const colCount = Math.max(...rows.map((r) => r.length), 1);

    // 补全表头
    while (header.length < colCount) {
      header.push(`列 ${header.length + 1}`);
    }

    const headerMd = `| ${header.join(' | ')} |`;
    const separatorMd = `| ${header.map(() => '---').join(' | ')} |`;
    const bodyMd = rows
      .slice(1)
      .map((row) => {
        while (row.length < colCount) {
          row.push('');
        }
        return `| ${row.join(' | ')} |`;
      })
      .join('\n');

    return `# ${baseName}\n\n${headerMd}\n${separatorMd}\n${bodyMd}`;
  }

  /**
   * 将 JSON 格式化并转换为带高亮代码块的 Markdown
   */
  private static convertJson(baseName: string, jsonText: string): string {
    let formatted = jsonText.trim();
    try {
      const obj = JSON.parse(jsonText);
      formatted = JSON.stringify(obj, null, 2);
    } catch {
      // JSON 解析失败则保持原样
    }

    return `# ${baseName}\n\n\`\`\`json\n${formatted}\n\`\`\``;
  }

  /**
   * 将代码与脚本文件转换为 Markdown
   */
  private static convertCode(baseName: string, ext: string, codeText: string): string {
    // 映射高亮语言标记
    const langMap: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      sh: 'bash',
      ps1: 'powershell',
      yml: 'yaml',
      env: 'properties',
      ini: 'ini',
    };

    const lang = langMap[ext] || ext;
    return `# ${baseName}\n\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\``;
  }

  /**
   * 将纯文本或日志转为段落式 Markdown
   */
  private static convertPlainText(baseName: string, rawText: string): string {
    const lines = rawText.split(/\r?\n/);
    const firstLine = lines.find((l) => l.trim().length > 0) || '';

    let title = baseName;
    let body = rawText.trim();

    // 如果第一行以 # 开头，直接作为 Markdown 标题
    if (firstLine.startsWith('# ')) {
      return body;
    }

    return `# ${title}\n\n${body}`;
  }

  /**
   * 将 Excel .xlsx 转换为 Markdown 表格
   */
  private static convertXlsx(baseName: string, buffer: ArrayBuffer): string {
    try {
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return `# ${baseName}\n\n*(空 Excel 工作簿)*`;
      }

      const sections: string[] = [`# ${baseName}\n`];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // 将当前 sheet 提取为二维数组
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (!rows || rows.length === 0) continue;

        // 如果包含多个工作表，使用二级标题区分
        if (workbook.SheetNames.length > 1) {
          sections.push(`\n## 工作表: ${sheetName}\n`);
        }

        const validRows = rows.filter(
          (r) => r && r.length > 0 && r.some((c) => c !== undefined && c !== null && String(c).trim() !== '')
        );
        if (validRows.length === 0) continue;

        const maxCols = Math.max(...validRows.map((r) => r.length), 1);
        const formatCell = (val: any) => {
          if (val === undefined || val === null) return '';
          return String(val).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
        };

        const header = validRows[0].map(formatCell);
        while (header.length < maxCols) {
          header.push(`列 ${header.length + 1}`);
        }

        const headerMd = `| ${header.join(' | ')} |`;
        const separatorMd = `| ${header.map(() => '---').join(' | ')} |`;
        const bodyMd = validRows
          .slice(1)
          .map((row) => {
            const cells = row.map(formatCell);
            while (cells.length < maxCols) {
              cells.push('');
            }
            return `| ${cells.join(' | ')} |`;
          })
          .join('\n');

        sections.push(`${headerMd}\n${separatorMd}\n${bodyMd}`);
      }

      return sections.join('\n');
    } catch (err: any) {
      throw new Error(`Excel (.xlsx) 解析失败: ${err.message || String(err)}`);
    }
  }

  /**
   * 将纯文本 PDF 提取并转换为 Markdown
   */
  private static async convertPdf(baseName: string, buffer: ArrayBuffer): Promise<string> {
    try {
      const { extractText } = await import('unpdf');
      const { text, totalPages } = await extractText(new Uint8Array(buffer));

      const pageTexts = Array.isArray(text) ? text : [text];
      const cleanContent = pageTexts
        .map((p) => (typeof p === 'string' ? p.trim() : ''))
        .filter(Boolean)
        .join('\n\n---\n\n');

      if (!cleanContent) {
        throw new Error('未能在该 PDF 中提取到纯文本内容，该文件可能为纯图片扫描件或已被加密');
      }

      return `# ${baseName}\n\n> 📄 **PDF 文档**（共 ${totalPages || 1} 页）\n\n${cleanContent}`;
    } catch (err: any) {
      throw new Error(`PDF 解析失败: ${err.message || String(err)}`);
    }
  }

  /**
   * 将 PowerPoint .pptx 提取为结构化 Markdown 大纲
   */
  private static async convertPptx(baseName: string, buffer: ArrayBuffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      // 获取所有 slide 文件的路径，并按编号自然排序 (slide1.xml, slide2.xml, ...)
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)![0], 10);
          const numB = parseInt(b.match(/\d+/)![0], 10);
          return numA - numB;
        });

      if (slideFiles.length === 0) {
        return `# ${baseName}\n\n> 📊 **PPT 演示文稿**（未检测到幻灯片内容页面）\n`;
      }

      const slidesContent: string[] = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const slidePath = slideFiles[i];
        const xml = await zip.file(slidePath)?.async('text');
        if (!xml) continue;

        // 从 xml 中提取段落 <a:p>...</a:p>
        const paragraphRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/gi;
        const paragraphs: string[] = [];
        let pMatch;
        while ((pMatch = paragraphRegex.exec(xml)) !== null) {
          const pBody = pMatch[1];
          const textRegex = /<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;
          let tMatch;
          let pText = '';
          while ((tMatch = textRegex.exec(pBody)) !== null) {
            pText += tMatch[1];
          }
          const cleanP = pText.trim();
          if (cleanP) {
            paragraphs.push(cleanP);
          }
        }

        const slideTitle = paragraphs[0] || `幻灯片 ${i + 1}`;
        const slideBody =
          paragraphs.length > 1
            ? paragraphs
                .slice(1)
                .map((p) => `- ${p}`)
                .join('\n')
            : '';

        slidesContent.push(`## 幻灯片 ${i + 1}: ${slideTitle}\n\n${slideBody}`);
      }

      return (
        `# ${baseName}\n\n` +
        `> 📊 **PowerPoint 演示文稿大纲**（共 ${slideFiles.length} 页幻灯片，已智能提取核心演讲点）\n\n` +
        `---\n\n` +
        slidesContent.join('\n\n---\n\n')
      );
    } catch (err: any) {
      return (
        `# ${baseName}\n\n` +
        `> 📊 **PowerPoint 演示文稿**\n\n` +
        `已安全存入个人网盘。解析提示: ${err.message || '文件已完整保存，可直接下载原文件'}`
      );
    }
  }

  /**
   * 将旧版 PowerPoint .ppt 二进制文稿转换为 Markdown 占位卡片
   */
  private static convertPpt(baseName: string, buffer: ArrayBuffer): string {
    const sizeKb = (buffer.byteLength / 1024).toFixed(1);
    return (
      `# 📊 ${baseName}.ppt\n\n` +
      `> 💾 **PowerPoint 97-2003 演示文稿** (大小: ${sizeKb} KB)\n\n` +
      `本文件为经典二进制 .ppt 演示文稿，已完整存入您的私有云盘中。您可以随时点击上方或右侧的 **【下载原文件】** 按钮获取原始文稿并在本地 Office 中播放。`
    );
  }
}
