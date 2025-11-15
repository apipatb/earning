// Email template generator for notifications and reports

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EarningNotificationData {
  amount: number;
  platform: string;
  date: string;
  currency: string;
}

export interface GoalAchievedData {
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  achievedDate: string;
}

export interface MonthlyReportData {
  month: string;
  year: number;
  totalEarnings: number;
  totalHours: number;
  avgRate: number;
  topPlatform: string;
  currency: string;
}

export interface BudgetAlertData {
  categoryName: string;
  plannedAmount: number;
  spentAmount: number;
  percentage: number;
  currency: string;
}

/**
 * Generate email template for new earning notification
 */
export function generateEarningNotificationEmail(data: EarningNotificationData): EmailTemplate {
  const subject = `New Earning Recorded: ${data.currency} ${data.amount.toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">💰 New Earning!</h1>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Great news! You've recorded a new earning.
      </p>

      <!-- Earning Details -->
      <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Amount:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 600; font-size: 18px; text-align: right;">
              ${data.currency} ${data.amount.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Platform:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">
              ${data.platform}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">
              ${new Date(data.date).toLocaleDateString()}
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Keep up the great work! 🎉
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500;">
          View Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
      <p>EarnTrack - Track your earnings efficiently</p>
      <p>© ${new Date().getFullYear()} EarnTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
New Earning Recorded

Amount: ${data.currency} ${data.amount.toFixed(2)}
Platform: ${data.platform}
Date: ${new Date(data.date).toLocaleDateString()}

Keep up the great work!

---
EarnTrack - Track your earnings efficiently
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email template for goal achieved notification
 */
export function generateGoalAchievedEmail(data: GoalAchievedData): EmailTemplate {
  const subject = `🎯 Goal Achieved: ${data.goalName}!`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">🎯 Goal Achieved!</h1>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 18px; color: #374151; margin-bottom: 20px; text-align: center; font-weight: 600;">
        Congratulations! You've achieved your goal:
      </p>

      <h2 style="font-size: 24px; color: #111827; text-align: center; margin: 20px 0;">
        ${data.goalName}
      </h2>

      <!-- Goal Details -->
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 5px; margin: 30px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #065f46; font-size: 14px;">Target Amount:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 600; font-size: 18px; text-align: right;">
              ${data.currency} ${data.targetAmount.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #065f46; font-size: 14px;">Current Amount:</td>
            <td style="padding: 10px 0; color: #10b981; font-weight: 600; font-size: 18px; text-align: right;">
              ${data.currency} ${data.currentAmount.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #065f46; font-size: 14px;">Achieved On:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 500; text-align: right;">
              ${new Date(data.achievedDate).toLocaleDateString()}
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; color: #374151; text-align: center; margin: 30px 0;">
        This is a significant milestone! Keep setting and achieving your goals. 🚀
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500;">
          View Your Goals
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
      <p>EarnTrack - Track your earnings efficiently</p>
      <p>© ${new Date().getFullYear()} EarnTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
🎯 Goal Achieved: ${data.goalName}!

Congratulations! You've achieved your goal.

Target Amount: ${data.currency} ${data.targetAmount.toFixed(2)}
Current Amount: ${data.currency} ${data.currentAmount.toFixed(2)}
Achieved On: ${new Date(data.achievedDate).toLocaleDateString()}

This is a significant milestone! Keep setting and achieving your goals.

---
EarnTrack - Track your earnings efficiently
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email template for monthly report
 */
export function generateMonthlyReportEmail(data: MonthlyReportData): EmailTemplate {
  const subject = `Monthly Earnings Report - ${data.month} ${data.year}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📊 Monthly Report</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${data.month} ${data.year}</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
        Here's your earnings summary for ${data.month}:
      </p>

      <!-- Stats Grid -->
      <div style="margin-bottom: 30px;">
        <!-- Total Earnings -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
          <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 5px;">Total Earnings</div>
          <div style="color: white; font-size: 32px; font-weight: 700;">${data.currency} ${data.totalEarnings.toFixed(2)}</div>
        </div>

        <!-- Hours and Rate -->
        <div style="display: table; width: 100%; border-spacing: 15px 0;">
          <div style="display: table-cell; width: 50%;">
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Hours Worked</div>
              <div style="color: #111827; font-size: 24px; font-weight: 700;">${data.totalHours.toFixed(1)}</div>
            </div>
          </div>
          <div style="display: table-cell; width: 50%;">
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Avg Rate</div>
              <div style="color: #111827; font-size: 24px; font-weight: 700;">${data.currency} ${data.avgRate.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Platform -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
        <div style="color: #92400e; font-size: 14px; margin-bottom: 5px;">🏆 Top Platform</div>
        <div style="color: #111827; font-size: 18px; font-weight: 600;">${data.topPlatform}</div>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Keep up the excellent work! Your consistent efforts are paying off.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500;">
          View Full Report
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
      <p>EarnTrack - Track your earnings efficiently</p>
      <p>© ${new Date().getFullYear()} EarnTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Monthly Earnings Report - ${data.month} ${data.year}

Here's your earnings summary for ${data.month}:

Total Earnings: ${data.currency} ${data.totalEarnings.toFixed(2)}
Hours Worked: ${data.totalHours.toFixed(1)}
Average Rate: ${data.currency} ${data.avgRate.toFixed(2)}/hr
Top Platform: ${data.topPlatform}

Keep up the excellent work!

---
EarnTrack - Track your earnings efficiently
  `.trim();

  return { subject, html, text };
}

/**
 * Generate email template for budget alert
 */
export function generateBudgetAlertEmail(data: BudgetAlertData): EmailTemplate {
  const isOverBudget = data.percentage >= 100;
  const isNearLimit = data.percentage >= 80 && data.percentage < 100;

  const alertType = isOverBudget ? '⚠️ Over Budget' : '📊 Budget Alert';
  const subject = `${alertType}: ${data.categoryName}`;

  const alertColor = isOverBudget ? '#ef4444' : '#f59e0b';
  const alertBg = isOverBudget ? '#fef2f2' : '#fef3c7';
  const alertText = isOverBudget ? '#991b1b' : '#92400e';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: ${alertColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">${alertType}</h1>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        ${isOverBudget
          ? 'Your budget category has exceeded its planned amount.'
          : 'Your budget category is approaching its limit.'
        }
      </p>

      <!-- Budget Details -->
      <div style="background: ${alertBg}; border-left: 4px solid ${alertColor}; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="color: ${alertText}; margin: 0 0 15px 0; font-size: 20px;">${data.categoryName}</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: ${alertText}; font-size: 14px;">Planned Amount:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: 600; text-align: right;">
              ${data.currency} ${data.plannedAmount.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: ${alertText}; font-size: 14px;">Spent Amount:</td>
            <td style="padding: 10px 0; color: ${alertColor}; font-weight: 600; font-size: 18px; text-align: right;">
              ${data.currency} ${data.spentAmount.toFixed(2)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: ${alertText}; font-size: 14px;">Usage:</td>
            <td style="padding: 10px 0; color: ${alertColor}; font-weight: 700; font-size: 18px; text-align: right;">
              ${data.percentage.toFixed(1)}%
            </td>
          </tr>
        </table>

        <!-- Progress Bar -->
        <div style="margin-top: 15px; background: white; border-radius: 10px; height: 10px; overflow: hidden;">
          <div style="background: ${alertColor}; height: 100%; width: ${Math.min(data.percentage, 100)}%;"></div>
        </div>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        ${isOverBudget
          ? 'Consider reviewing your spending in this category and adjusting your budget if needed.'
          : 'You may want to monitor spending in this category closely for the remainder of the period.'
        }
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="#" style="display: inline-block; background: ${alertColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 500;">
          Review Budget
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
      <p>EarnTrack - Track your earnings efficiently</p>
      <p>© ${new Date().getFullYear()} EarnTrack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
${alertType}: ${data.categoryName}

${isOverBudget
  ? 'Your budget category has exceeded its planned amount.'
  : 'Your budget category is approaching its limit.'
}

Category: ${data.categoryName}
Planned Amount: ${data.currency} ${data.plannedAmount.toFixed(2)}
Spent Amount: ${data.currency} ${data.spentAmount.toFixed(2)}
Usage: ${data.percentage.toFixed(1)}%

${isOverBudget
  ? 'Consider reviewing your spending in this category and adjusting your budget if needed.'
  : 'You may want to monitor spending in this category closely.'
}

---
EarnTrack - Track your earnings efficiently
  `.trim();

  return { subject, html, text };
}

/**
 * Preview email template in a new window (for testing)
 */
export function previewEmailTemplate(template: EmailTemplate): void {
  const previewWindow = window.open('', '_blank');
  if (previewWindow) {
    previewWindow.document.write(template.html);
    previewWindow.document.close();
  }
}

/**
 * Copy email HTML to clipboard
 */
export async function copyEmailToClipboard(template: EmailTemplate): Promise<void> {
  try {
    await navigator.clipboard.writeText(template.html);
    console.log('Email template copied to clipboard');
  } catch (error) {
    console.error('Failed to copy email template:', error);
  }
}
