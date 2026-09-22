import { DocumentMetadata } from '../domain/types';

export interface DocumentRepositoryPort {
  create(doc: DocumentMetadata, ownerRoleId: string, creatorUserId: string): Promise<void>;
  findById(id: string): Promise<DocumentMetadata | null>;
  incrementViews(id: string): Promise<void>;
  listAccessible(userId: string, search?: string, categoryId?: string, sort?: 'latest' | 'views', tag?: string): Promise<DocumentMetadata[]>;
  listPublic(search?: string, categoryId?: string, sort?: 'latest' | 'views', tag?: string): Promise<DocumentMetadata[]>;
  listAll(categoryId?: string, sort?: 'latest' | 'views', tag?: string): Promise<DocumentMetadata[]>;
  updatePublicStatus(id: string, isPublic: boolean): Promise<void>;
  updateAiSummary(id: string, summary: string): Promise<void>;
  attachTags(fileId: string, tags: string[]): Promise<void>;
  listPopularTags(limit?: number): Promise<{ name: string; count: number }[]>;
  delete(id: string): Promise<void>;

}
