import { DocumentMetadata } from '../domain/types';

export interface DocumentRepositoryPort {
  create(doc: DocumentMetadata, ownerRoleId: string, creatorUserId: string): Promise<void>;
  findById(id: string): Promise<DocumentMetadata | null>;
  incrementViews(id: string): Promise<void>;
  listAccessible(userId: string, search?: string, categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]>;
  listPublic(search?: string, categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]>;
  listAll(categoryId?: string, sort?: 'latest' | 'views'): Promise<DocumentMetadata[]>;
  updatePublicStatus(id: string, isPublic: boolean): Promise<void>;
  delete(id: string): Promise<void>;
}
