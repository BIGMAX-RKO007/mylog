export type Privilege = 'READ' | 'WRITE' | 'DELETE' | 'OWNERSHIP';

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: number;
}

export interface Grant {
  roleId: string;
  objectId: string;
  privilege: Privilege;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: number;
}
