export interface DocumentMetadata {
  id: string;
  name: string;
  title: string;
  size: number;
  r2Key: string;
  sha256: string;
  isPublic: boolean;
  ownerRoleId: string;
  categoryId?: string;
  categoryName?: string;
  parentCategoryName?: string;
  views: number;
  aiSummary?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  canonicalId?: string;
  usageCount: number;
  createdAt: number;
}

export interface ParsedDocument {
  title: string;
  renderedHtml: string;
  rawMarkdown: string;
  wordCount: number;
  size: number;
  aiSummary?: string;
  tags?: string[];
}

