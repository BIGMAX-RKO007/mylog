export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  orderIndex: number;
  createdAt: number;
}

export interface CategoryTreeItem {
  id: string;
  name: string;
  parentId?: string | null;
  orderIndex: number;
  children: CategoryTreeItem[];
}
