export interface Bindings {
  DB: D1Database;
  STORAGE: R2Bucket;
  AUTH_SECRET?: string;
  AI?: any;
  TAG_VECTORS?: any;
}


export interface UserSession {
  userId: string;
  username: string;
  currentRoleId: string;
  roles: string[];
}

export interface AppServices {
  d1UserRepo: any;
  d1RbacRepo: any;
  docRepo: any;
  storage: any;
  authUseCase: any;
  checkPermissionUseCase: any;
  commitDocUseCase: any;
  getDocUseCase: any;
  deleteDocUseCase: any;
  categoryRepo: any;
  smartSearchUseCase: any;
}


export interface AppVariables {
  session?: UserSession;
  services: AppServices;
}

export type AppContext = {
  Bindings: Bindings;
  Variables: AppVariables;
};
