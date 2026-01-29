import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiChatService } from '../services/ai-chat-service';
import { fileParserService } from '../services/file-parser-service';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import { logger } from '../utils/logger';

export class AIChatController {
  /**
   * POST /api/admin/ai-chat/upload
   * Upload and parse file
   */
  uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 'BAD_REQUEST', 400);
    }

    const { originalname, mimetype, size, buffer } = req.file;

    try {
      // Parse file
      logger.info(`Parsing file: ${originalname} (${mimetype}), size: ${size} bytes`);
      const parsedData = await fileParserService.parseFile(buffer, mimetype);

      // Create chat session
      const sessionId = await aiChatService.createChatSession(
        req.user!.id,
        originalname,
        mimetype,
        size,
        parsedData
      );

      // Get suggested questions
      const suggestedQuestions = aiChatService.getSuggestedQuestions(parsedData.summary);

      sendSuccess(
        res,
        {
          sessionId,
          fileName: originalname,
          fileType: mimetype,
          fileSize: size,
          summary: parsedData.summary,
          suggestedQuestions,
        },
        201
      );
    } catch (error: any) {
      logger.error('Error uploading file:', error);
      sendError(res, error.message || 'Failed to process file', 'UPLOAD_ERROR', 500);
    }
  });

  /**
   * GET /api/admin/ai-chat/sessions
   * List user's chat sessions
   */
  listSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const sessions = await aiChatService.listUserSessions(req.user!.id);
      sendSuccess(res, { sessions });
    } catch (error: any) {
      logger.error('Error listing sessions:', error);
      sendError(res, error.message || 'Failed to list sessions', 'LIST_ERROR', 500);
    }
  });

  /**
   * GET /api/admin/ai-chat/sessions/:id
   * Get session info
   */
  getSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const session = await aiChatService.getSession(id);
      sendSuccess(res, session);
    } catch (error: any) {
      logger.error('Error getting session:', error);
      sendError(res, error.message || 'Failed to get session', 'GET_SESSION_ERROR', 500);
    }
  });

  /**
   * POST /api/admin/ai-chat/sessions/:id/messages
   * Send message to AI
   */
  sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return sendError(res, 'Message is required', 'BAD_REQUEST', 400);
    }

    try {
      const response = await aiChatService.sendMessage(id, message);
      sendSuccess(res, response);
    } catch (error: any) {
      logger.error('Error sending message:', error);
      sendError(res, error.message || 'Failed to send message', 'SEND_MESSAGE_ERROR', 500);
    }
  });

  /**
   * GET /api/admin/ai-chat/sessions/:id/messages
   * Get chat history
   */
  getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const messages = await aiChatService.getChatHistory(id);
      sendSuccess(res, { messages });
    } catch (error: any) {
      logger.error('Error getting messages:', error);
      sendError(res, error.message || 'Failed to get messages', 'GET_MESSAGES_ERROR', 500);
    }
  });

  /**
   * DELETE /api/admin/ai-chat/sessions/:id
   * Delete session
   */
  deleteSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      await aiChatService.deleteSession(id);
      sendSuccess(res, { message: 'Session deleted successfully' });
    } catch (error: any) {
      logger.error('Error deleting session:', error);
      sendError(res, error.message || 'Failed to delete session', 'DELETE_ERROR', 500);
    }
  });
}

export const aiChatController = new AIChatController();
