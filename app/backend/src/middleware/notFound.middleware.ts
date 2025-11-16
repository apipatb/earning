import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';

export const notFound = (req: Request, res: Response) => {
  return ResponseUtil.notFound(
    res,
    `Route ${req.originalUrl} not found`
  );
};
