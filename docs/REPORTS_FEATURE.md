# Reports Feature / Функція звітів

## Overview / Огляд

This document describes the new Reports feature that allows administrators to generate and download reports for a selected period.

Цей документ описує нову функцію Звітів, яка дозволяє адміністраторам генерувати та завантажувати звіти за вибраний період.

## Features / Можливості

### 1. Period Selection / Вибір періоду

Administrators can choose from predefined periods or set a custom date range:

Адміністратори можуть вибрати з готових періодів або встановити власний діапазон дат:

- **Current Month** / Поточний місяць
- **Last Month** / Минулий місяць
- **Last 3 Months** / Останні 3 місяці
- **Last 6 Months** / Останні 6 місяців
- **Current Year** / Поточний рік
- **Custom Period** / Власний період

### 2. Filters / Фільтри

Reports can be filtered by:

Звіти можна фільтрувати за:

- **Status** / Статус:
  - All / Всі
  - Started / Початок
  - Awaiting Payment / Очікування оплати
  - Paid / Оплачено
  - Completed / Завершено
  - Failed / Невдала
  - Refunded / Повернуто

- **Plan** / План:
  - All / Всі
  - Basic
  - Standard
  - Premium

### 3. Export Formats / Формати експорту

Reports can be downloaded in the following formats:

Звіти можна завантажити в наступних форматах:

- **CSV** - Comma-separated values (can be opened in Excel, Google Sheets, etc.)
- **Excel (CSV)** - CSV format optimized for Excel

### 4. Report Contents / Вміст звіту

Each report includes the following information:

Кожен звіт містить наступну інформацію:

| Column | Description / Опис |
|--------|-------------------|
| Session ID | Unique session identifier / Унікальний ідентифікатор сесії |
| Transaction ID | PayPal transaction ID / ID транзакції PayPal |
| Plan | Subscription plan / План підписки |
| Email (User) | Email provided by user via Telegram bot / Email надано користувачем через Telegram бот |
| Email (PayPal) | Email from PayPal payment / Email з PayPal платежу |
| Final Email | Final email used for access (priority: user > paypal) / Фінальний email для доступу |
| Amount | Payment amount / Сума оплати |
| Currency | Payment currency / Валюта оплати |
| Status | Payment status / Статус платежу |
| Payment Date | Date of payment / Дата оплати |
| End Date | Subscription end date (payment date + 60 days) / Дата закінчення підписки |
| Created At | Session creation date / Дата створення сесії |
| First Name | User's first name / Ім'я користувача |
| Last Name | User's last name / Прізвище користувача |

## Usage / Використання

### Frontend / Фронтенд

1. Navigate to "Звіти" (Reports) in the left sidebar
2. Select the desired period
3. Apply filters (optional)
4. Choose export format
5. Click "Згенерувати та завантажити звіт" (Generate and download report)

### Backend API

**Endpoint:** `GET /api/admin/export`

**Authentication:** Required (Bearer JWT token)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | Start date in YYYY-MM-DD format |
| endDate | string | No | End date in YYYY-MM-DD format |
| status | enum | No | Filter by status (started, awaiting_payment, paid, completed, failed, refunded) |
| plan | enum | No | Filter by plan (basic, standard, premium) |
| format | enum | No | Export format (csv, excel) - defaults to csv |

**Example Request:**

```bash
curl -X GET "https://your-api.com/api/admin/export?startDate=2024-01-01&endDate=2024-01-31&status=completed&plan=premium&format=csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="sessions-export-YYYY-MM-DD.csv"`
- **Body:** CSV file content

## Technical Implementation / Технічна реалізація

### Frontend Components

**New Files:**
- `/frontend/src/pages/Reports.tsx` - Main reports page component

**Modified Files:**
- `/frontend/src/components/Layout.tsx` - Added "Звіти" menu item
- `/frontend/src/App.tsx` - Added `/reports` route

### Backend

**Modified Files:**
- `/backend/src/validators/admin-validators.ts` - Added `exportSchema` validation
- `/backend/src/routes/admin-routes.ts` - Added validation to export route
- `/backend/src/controllers/admin-controller.ts` - Updated `exportData` method with proper typing

**Existing Services Used:**
- `/backend/src/services/export-service.ts` - Handles CSV generation and export logic

## Security / Безпека

- All export requests require authentication (JWT token)
- Input validation using Zod schema
- Date format validation (YYYY-MM-DD)
- Rate limiting applied to all admin routes
- No sensitive data (passwords, tokens) included in exports

## Performance Considerations / Продуктивність

- Large exports may take time depending on the number of records
- No pagination in exports - all matching records are exported
- CSV format is used for efficiency
- Streaming response to avoid memory issues with large datasets

## Future Enhancements / Майбутні покращення

Potential improvements for future versions:

Потенційні покращення для майбутніх версій:

1. **Additional Export Formats:**
   - Native Excel (.xlsx) format
   - JSON format for API integration
   - PDF reports with charts

2. **Scheduled Reports:**
   - Automatic report generation on a schedule
   - Email delivery of reports

3. **Advanced Filters:**
   - Filter by payment amount range
   - Filter by user name
   - Multi-select for status and plan

4. **Report Templates:**
   - Save frequently used filter combinations
   - Quick access to predefined reports

5. **Analytics Dashboard:**
   - Visual charts before downloading
   - Interactive data exploration

## Troubleshooting / Вирішення проблем

### Report download fails

**Problem:** Report generation fails or download doesn't start

**Solutions:**
1. Check that JWT token is valid
2. Verify date format (must be YYYY-MM-DD)
3. Check browser console for errors
4. Ensure backend service is running
5. Check backend logs for errors

### Empty report

**Problem:** Downloaded report contains no data

**Solutions:**
1. Verify that data exists for the selected period
2. Check applied filters
3. Try removing filters to see all data
4. Check database connection

### Report contains incorrect data

**Problem:** Report data doesn't match expected results

**Solutions:**
1. Verify selected date range
2. Check filter settings
3. Compare with data in "Платежі" (Payments) page
4. Check timezone settings (all dates are in UTC)

## Support / Підтримка

For issues or questions about the Reports feature, please:

З питань чи проблем щодо функції Звітів:

1. Check this documentation
2. Review backend logs
3. Check browser console for errors
4. Contact system administrator

