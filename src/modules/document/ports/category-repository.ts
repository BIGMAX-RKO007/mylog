import { Category, CategoryTreeItem } from '../domain/category';

export interface CategoryRepositoryPort {
  listAll(): Promise<Category[]>;
  getTree(): Promise<CategoryTreeItem[]>;
  create(name: string, parentId?: string | null): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  delete(id: string): Promise<void>;
}
