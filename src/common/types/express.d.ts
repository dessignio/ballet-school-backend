declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      username: string;
      roleId: string;
      studioId: string;
    };
  }
}
