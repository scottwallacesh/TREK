import { DEFAULT_LANGUAGE } from '../config';

import express, { Request, Response } from 'express';

const router = express.Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ defaultLanguage: DEFAULT_LANGUAGE });
});

export default router;
