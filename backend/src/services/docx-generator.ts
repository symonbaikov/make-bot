import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
} from 'docx';
import { Response } from 'express';
import { ReportData, ReportSummary } from './gemini-service';
import { format as formatDate } from 'date-fns';

export class DOCXGenerator {
  async generateReport(
    sessions: ReportData[],
    summary: ReportSummary,
    res: Response
  ): Promise<void> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Header
            ...this.createHeader(summary),
            // Summary
            ...this.createSummary(summary),
            // Metrics
            ...this.createMetrics(summary),
            // Insights
            ...this.createInsights(summary),
            // Plan Breakdown
            ...this.createPlanBreakdown(summary),
            // Recommendations
            ...this.createRecommendations(summary),
            // Page break
            new Paragraph({ text: '', pageBreakBefore: true }),
            // Detailed Table
            ...this.createDetailedTable(sessions),
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${formatDate(new Date(), 'yyyy-MM-dd')}.docx"`
    );

    // Send buffer
    res.send(Buffer.from(buffer));
  }

  private createHeader(summary: ReportSummary): Paragraph[] {
    return [
      new Paragraph({
        text: summary.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${formatDate(new Date(), 'MMMM dd, yyyy')}`,
            color: '6B7280',
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ];
  }

  private createSummary(summary: ReportSummary): Paragraph[] {
    return [
      new Paragraph({
        text: 'Executive Summary',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: summary.summary,
        spacing: { after: 300 },
      }),
    ];
  }

  private createMetrics(summary: ReportSummary): Paragraph[] {
    const { keyMetrics } = summary;

    return [
      new Paragraph({
        text: 'Key Metrics',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Total Sessions: `,
            bold: true,
          }),
          new TextRun({
            text: keyMetrics.totalSessions.toString(),
            color: '6366F1',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Total Revenue: `,
            bold: true,
          }),
          new TextRun({
            text: `$${keyMetrics.totalRevenue.toFixed(2)}`,
            color: '10B981',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Completed Payments: `,
            bold: true,
          }),
          new TextRun({
            text: keyMetrics.completedPayments.toString(),
            color: '8B5CF6',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Average Amount: `,
            bold: true,
          }),
          new TextRun({
            text: `$${keyMetrics.averageAmount.toFixed(2)}`,
            color: 'F59E0B',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Conversion Rate: `,
            bold: true,
          }),
          new TextRun({
            text: `${keyMetrics.conversionRate.toFixed(1)}%`,
            color: 'EC4899',
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 300 },
      }),
    ];
  }

  private createInsights(summary: ReportSummary): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Key Insights',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];

    summary.insights.forEach((insight, index) => {
      paragraphs.push(
        new Paragraph({
          text: `${index + 1}. ${insight}`,
          spacing: { after: 100 },
          bullet: { level: 0 },
        })
      );
    });

    paragraphs.push(new Paragraph({ text: '', spacing: { after: 300 } }));

    return paragraphs;
  }

  private createPlanBreakdown(summary: ReportSummary): any[] {
    const elements: any[] = [
      new Paragraph({
        text: 'Plan Breakdown',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];

    // Create table
    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // Header row
        new TableRow({
          children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Plan', bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: '6366F1' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Sessions', bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: '6366F1' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Revenue', bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: '6366F1' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Percentage', bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: '6366F1' },
          }),
          ],
        }),
        // Data rows
        ...summary.planBreakdown.map(
          (plan, index) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: plan.plan, alignment: AlignmentType.CENTER })],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: plan.count.toString(), alignment: AlignmentType.CENTER })],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: `$${plan.revenue.toFixed(2)}`, alignment: AlignmentType.CENTER })],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [new Paragraph({ text: `${plan.percentage.toFixed(1)}%`, alignment: AlignmentType.CENTER })],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
              ],
            })
        ),
      ],
    });

    elements.push(table);
    elements.push(new Paragraph({ text: '', spacing: { after: 300 } }));

    return elements;
  }

  private createRecommendations(summary: ReportSummary): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Recommendations',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];

    summary.recommendations.forEach((recommendation, index) => {
      paragraphs.push(
        new Paragraph({
          text: `${index + 1}. ${recommendation}`,
          spacing: { after: 100 },
          bullet: { level: 0 },
        })
      );
    });

    return paragraphs;
  }

  private createDetailedTable(sessions: ReportData[]): any[] {
    const elements: any[] = [
      new Paragraph({
        text: 'Detailed Transaction List',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    ];

    if (sessions.length === 0) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'No sessions found for the selected period.',
              italics: true,
              color: '6B7280',
            }),
          ],
        })
      );
      return elements;
    }

    // Limit rows for performance
    const maxRows = Math.min(sessions.length, 50);

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Session ID', bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: '6366F1' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Plan', bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: '6366F1' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Amount', bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: '6366F1' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Status', bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: '6366F1' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'Date', bold: true })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: '6366F1' },
            }),
          ],
        }),
        // Data rows
        ...sessions.slice(0, maxRows).map(
          (session, index) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      text: session.sessionId.substring(0, 16) + '...',
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: session.plan.charAt(0) + session.plan.slice(1).toLowerCase(),
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: `$${Number(session.amount).toFixed(2)}`,
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: session.status.charAt(0) + session.status.slice(1).toLowerCase().replace('_', ' '),
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: session.paymentDate ? formatDate(session.paymentDate, 'yyyy-MM-dd HH:mm') : 'N/A',
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  shading: { fill: index % 2 === 0 ? 'F9FAFB' : 'FFFFFF' },
                }),
              ],
            })
        ),
      ],
    });

    elements.push(table);

    if (sessions.length > maxRows) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `... and ${sessions.length - maxRows} more sessions`,
              italics: true,
              color: '6B7280',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
        })
      );
    }

    return elements;
  }
}

export const docxGenerator = new DOCXGenerator();

