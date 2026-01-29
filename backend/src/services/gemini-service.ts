import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { Plan, SessionStatus } from '@prisma/client';

export interface ReportData {
  sessionId: string;
  txnId: string | null;
  plan: Plan;
  emailUser: string | null;
  emailPaypal: string | null;
  amount: number;
  currency: string;
  status: SessionStatus;
  paymentDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  user: {
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface ReportSummary {
  title: string;
  period: string;
  summary: string;
  keyMetrics: {
    totalSessions: number;
    totalRevenue: number;
    completedPayments: number;
    averageAmount: number;
    conversionRate: number;
  };
  insights: string[];
  planBreakdown: {
    plan: string;
    count: number;
    revenue: number;
    percentage: number;
  }[];
  recommendations: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not found in environment variables. AI features will be disabled.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      logger.info('Gemini AI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI:', error);
    }
  }

  async generateReportSummary(
    sessions: ReportData[],
    startDate: string,
    endDate: string
  ): Promise<ReportSummary> {
    if (!this.model) {
      // Fallback to simple summary without AI
      return this.generateSimpleSummary(sessions, startDate, endDate);
    }

    try {
      // Calculate metrics
      const totalSessions = sessions.length;
      const completedPayments = sessions.filter(s => s.status === SessionStatus.COMPLETED).length;
      const totalRevenue = sessions.reduce((sum, s) => sum + Number(s.amount), 0);
      const averageAmount = totalSessions > 0 ? totalRevenue / totalSessions : 0;
      const conversionRate = totalSessions > 0 ? (completedPayments / totalSessions) * 100 : 0;

      // Plan breakdown
      const planBreakdown = this.calculatePlanBreakdown(sessions);

      // Prepare data for AI
      const prompt = `Analyze this payment report data and provide insights in JSON format.

Period: ${startDate} to ${endDate}
Total Sessions: ${totalSessions}
Completed Payments: ${completedPayments}
Total Revenue: $${totalRevenue.toFixed(2)}
Average Amount: $${averageAmount.toFixed(2)}
Conversion Rate: ${conversionRate.toFixed(1)}%

Plan Breakdown:
${planBreakdown.map(p => `- ${p.plan}: ${p.count} sessions, $${p.revenue.toFixed(2)} revenue`).join('\n')}

Please provide:
1. A concise summary (2-3 sentences) of the overall performance
2. 3-5 key insights about the data
3. 2-3 actionable recommendations for improvement

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "string",
  "insights": ["string", "string", "string"],
  "recommendations": ["string", "string"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const aiData = JSON.parse(jsonMatch[0]);

      return {
        title: `Payment Report: ${startDate} - ${endDate}`,
        period: `${startDate} to ${endDate}`,
        summary: aiData.summary,
        keyMetrics: {
          totalSessions,
          totalRevenue,
          completedPayments,
          averageAmount,
          conversionRate,
        },
        insights: aiData.insights,
        planBreakdown,
        recommendations: aiData.recommendations,
      };
    } catch (error) {
      logger.error('Error generating AI summary:', error);
      // Fallback to simple summary
      return this.generateSimpleSummary(sessions, startDate, endDate);
    }
  }

  private generateSimpleSummary(
    sessions: ReportData[],
    startDate: string,
    endDate: string
  ): ReportSummary {
    const totalSessions = sessions.length;
    const completedPayments = sessions.filter(s => s.status === SessionStatus.COMPLETED).length;
    const totalRevenue = sessions.reduce((sum, s) => sum + Number(s.amount), 0);
    const averageAmount = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const conversionRate = totalSessions > 0 ? (completedPayments / totalSessions) * 100 : 0;

    const planBreakdown = this.calculatePlanBreakdown(sessions);

    return {
      title: `Payment Report: ${startDate} - ${endDate}`,
      period: `${startDate} to ${endDate}`,
      summary: `This report covers ${totalSessions} sessions with a total revenue of $${totalRevenue.toFixed(2)}. ${completedPayments} payments were completed, achieving a ${conversionRate.toFixed(1)}% conversion rate.`,
      keyMetrics: {
        totalSessions,
        totalRevenue,
        completedPayments,
        averageAmount,
        conversionRate,
      },
      insights: [
        `Total revenue generated: $${totalRevenue.toFixed(2)}`,
        `Average transaction value: $${averageAmount.toFixed(2)}`,
        `Conversion rate: ${conversionRate.toFixed(1)}%`,
      ],
      planBreakdown,
      recommendations: [
        'Monitor conversion rates regularly',
        'Consider optimizing payment flow for better conversion',
      ],
    };
  }

  private calculatePlanBreakdown(sessions: ReportData[]) {
    const plans = [Plan.BASIC, Plan.STANDARD, Plan.PREMIUM];
    const totalSessions = sessions.length;

    return plans.map(plan => {
      const planSessions = sessions.filter(s => s.plan === plan);
      const count = planSessions.length;
      const revenue = planSessions.reduce((sum, s) => sum + Number(s.amount), 0);
      const percentage = totalSessions > 0 ? (count / totalSessions) * 100 : 0;

      return {
        plan: plan.charAt(0) + plan.slice(1).toLowerCase(),
        count,
        revenue,
        percentage,
      };
    });
  }
}

export const geminiService = new GeminiService();

