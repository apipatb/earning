import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import {
  uploadFile,
  getFiles,
  getDownloadUrl,
  deleteFile,
  shareFile,
  getSharedFiles,
  createFolder,
  getFolders,
} from '../controllers/file.controller';

const router = Router();

// Configure multer for file uploads (using memory storage for S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// All routes require authentication
router.use(authenticate);

// File routes
router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/shared-with-me', getSharedFiles);
router.get('/:id/download', getDownloadUrl);
router.delete('/:id', deleteFile);
router.post('/:id/share', shareFile);

// Folder routes (using /folders prefix in server.ts)
export const folderRouter = Router();
folderRouter.use(authenticate);
folderRouter.post('/', createFolder);
folderRouter.get('/', getFolders);

export default router;
