import { AuthService } from '../services/auth-service';
import { RbacService } from '../services/rbac-service';
import { DocumentService } from '../services/document-service';

export interface Bindings {
  DB: D1Database;
  STORAGE?: R2Bucket;
  AUTH_SECRET?: string;
  AI?: any;
  TAG_VECTORS?: any;
  AUTH_HUB_URL?: string;
  MYAUTH_APP_ID?: string;
  MYAUTH_CLIENT_SECRET?: string;
}

export interface UserSession {
  userId: string;
  username: string;
  currentRoleId: string;
  roles: string[];
}

export interface AppServices {
  authService: AuthService;
  rbacService: RbacService;
  documentService: DocumentService;
}

export interface AppVariables {
  session?: UserSession;
  services: AppServices;
}

export type AppContext = {
  Bindings: Bindings;
  Variables: AppVariables;
};
