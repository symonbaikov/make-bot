import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ParsedData } from './file-parser-service';

export interface ChatContext {
  fileName: string;
  fileType: string;
  summary: ParsedData['summary'];
  rawText?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export class AIChatService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not found. AI chat will not be available.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      logger.info('AI Chat Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Chat Service:', error);
    }
  }

  /**
   * Create new chat session
   */
  async createChatSession(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    parsedData: ParsedData,
    filePath?: string
  ): Promise<string> {
    try {
      // @ts-ignore - Prisma types will be correct at runtime
      const session = await prisma.chatSession.create({
        data: {
          userId,
          fileName,
          fileType,
          fileSize,
          filePath,
          extractedData: parsedData as any,
          metadata: {
            createdBy: userId,
            parsedAt: new Date().toISOString(),
          },
        },
      });

      logger.info(`Chat session created: ${session.id}`);
      return session.id;
    } catch (error) {
      logger.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  /**
   * Send message and get AI response
   */
  async sendMessage(sessionId: string, userMessage: string): Promise<ChatMessage> {
    if (!this.model) {
      throw new Error('AI service is not available. Please configure GEMINI_API_KEY.');
    }

    try {
      // Get session data
      // @ts-ignore - Prisma types will be correct at runtime
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Last 10 messages for context
          },
        },
      });

      if (!session) {
        throw new Error('Chat session not found');
      }

      // Save user message
      // @ts-ignore - Prisma types will be correct at runtime
      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: userMessage,
        },
      });

      // Build context from file data
      const context = this.buildContext(session);

      // Get recent conversation history
      const history = session.messages
        .reverse()
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      // Generate AI response
      const aiResponse = await this.queryGemini(userMessage, context, history);

      // Save AI response
      // @ts-ignore - Prisma types will be correct at runtime
      const assistantMsg = await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: aiResponse,
        },
      });

      return {
        id: assistantMsg.id,
        role: 'assistant',
        content: assistantMsg.content,
        createdAt: assistantMsg.createdAt,
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      // @ts-ignore - Prisma types will be correct at runtime
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      return messages.map((m: { id: string; role: string; content: string; createdAt: Date }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw new Error('Failed to get chat history');
    }
  }

  /**
   * Get session info
   */
  async getSession(sessionId: string) {
    try {
      // @ts-ignore - Prisma types will be correct at runtime
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      return {
        id: session.id,
        fileName: session.fileName,
        fileType: session.fileType,
        fileSize: session.fileSize,
        summary: (session.extractedData as any).summary,
        createdAt: session.createdAt,
      };
    } catch (error) {
      logger.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * List user's chat sessions
   */
  async listUserSessions(userId: string) {
    try {
      // @ts-ignore - Prisma types will be correct at runtime
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      return sessions.map((s: {
        id: string;
        fileName: string;
        fileType: string;
        createdAt: Date;
        extractedData: any;
        _count: { messages: number };
      }) => ({
        id: s.id,
        fileName: s.fileName,
        fileType: s.fileType,
        messageCount: s._count.messages,
        createdAt: s.createdAt,
        summary: (s.extractedData as any).summary,
      }));
    } catch (error) {
      logger.error('Error listing sessions:', error);
      throw new Error('Failed to list sessions');
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // @ts-ignore - Prisma types will be correct at runtime
      await prisma.chatSession.delete({
        where: { id: sessionId },
      });
      logger.info(`Chat session deleted: ${sessionId}`);
    } catch (error) {
      logger.error('Error deleting session:', error);
      throw new Error('Failed to delete session');
    }
  }

  /**
   * Build context from session data
   */
  private buildContext(session: any): string {
    const data = session.extractedData;
    const summary = data.summary || {};

    let context = `You are an AI assistant analyzing payment report data.\n\n`;
    context += `FILE INFORMATION:\n`;
    context += `- File: ${session.fileName}\n`;
    context += `- Type: ${session.fileType}\n`;
    context += `- Total Records: ${summary.totalRecords || 0}\n\n`;

    if (summary.metrics) {
      context += `KEY METRICS:\n`;
      if (summary.metrics.totalSessions) {
        context += `- Total Sessions: ${summary.metrics.totalSessions}\n`;
      }
      if (summary.metrics.totalRevenue) {
        context += `- Total Revenue: $${summary.metrics.totalRevenue.toFixed(2)}\n`;
      }
      if (summary.metrics.avgAmount) {
        context += `- Average Amount: $${summary.metrics.avgAmount.toFixed(2)}\n`;
      }
      if (summary.metrics.plans) {
        context += `- Plans Distribution:\n`;
        Object.entries(summary.metrics.plans).forEach(([plan, count]) => {
          context += `  - ${plan}: ${count} sessions\n`;
        });
      }
      context += `\n`;
    }

    if ((summary.metrics as any)?.dateRange) {
      const dateRange = (summary.metrics as any).dateRange;
      context += `DATE RANGE: ${dateRange.start} to ${dateRange.end}\n\n`;
    }

    if (data.rawText) {
      context += `REPORT TEXT:\n${data.rawText.substring(0, 3000)}\n\n`;
    }

    context += `INSTRUCTIONS:\n`;
    context += `- Answer questions based on the data provided\n`;
    context += `- Be concise and specific\n`;
    context += `- Use numbers and percentages\n`;
    context += `- Format responses with markdown\n`;
    context += `- Use emojis for better readability\n`;
    context += `- If asked for trends, analyze the data carefully\n`;
    context += `- If data is missing, say so clearly\n\n`;

    return context;
  }

  /**
   * Query Gemini AI
   */
  private async queryGemini(message: string, context: string, history: string): Promise<string> {
    try {
      let prompt = context;

      if (history) {
        prompt += `CONVERSATION HISTORY:\n${history}\n\n`;
      }

      prompt += `USER QUESTION:\n${message}\n\n`;
      prompt += `Please provide a helpful, detailed answer based on the data.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error querying Gemini:', error);
      throw new Error('Failed to get AI response');
    }
  }

  /**
   * Get suggested questions based on data
   */
  getSuggestedQuestions(summary: ParsedData['summary']): string[] {
    const questions: string[] = [];

    if (summary.metrics?.totalRevenue) {
      questions.push('What is the total revenue?');
      questions.push('What is the average transaction amount?');
    }

    if (summary.metrics?.plans) {
      questions.push('Which plan is most popular?');
      questions.push('Compare revenue by plan');
    }

    if (summary.metrics?.totalSessions) {
      questions.push('What is the conversion rate?');
    }

    if ((summary.metrics as any)?.dateRange) {
      questions.push('Show me trends over time');
      questions.push('What were the peak days?');
    }

    // Generic questions
    questions.push('Give me 3 key insights');
    questions.push('What recommendations do you have?');
    questions.push('Are there any anomalies in the data?');

    return questions.slice(0, 6); // Return top 6
  }
}

export const aiChatService = new AIChatService();
