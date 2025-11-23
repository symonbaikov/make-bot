import { Router } from 'express';
import multer from 'multer';
import { aiChatController } from '../controllers/ai-chat-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow CSV, PDF, DOCX
    const allowedTypes = [
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, PDF, and DOCX files are allowed.'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// POST /api/admin/ai-chat/upload
router.post('/upload', upload.single('file'), aiChatController.uploadFile);

// GET /api/admin/ai-chat/sessions
router.get('/sessions', aiChatController.listSessions);

// GET /api/admin/ai-chat/sessions/:id
router.get('/sessions/:id', aiChatController.getSession);

// POST /api/admin/ai-chat/sessions/:id/messages
router.post('/sessions/:id/messages', aiChatController.sendMessage);

// GET /api/admin/ai-chat/sessions/:id/messages
router.get('/sessions/:id/messages', aiChatController.getMessages);

// DELETE /api/admin/ai-chat/sessions/:id
router.delete('/sessions/:id', aiChatController.deleteSession);

export default router;
