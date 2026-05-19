"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

/**
 * Convert Decimal to number
 */
const toNumber = (val) => {
  if (!val) return 0;
  return typeof val === "object" && typeof val.toNumber === "function"
    ? val.toNumber()
    : val;
};

/**
 * Calculate Financial Health Score (0-100)
 * Components:
 * - Savings Rate (30%)
 * - Income-to-Expense Ratio (25%)
 * - Budget Adherence (20%)
 * - Emergency Fund Status (15%)
 * - Spending Consistency (10%)
 */
export async function calculateFinancialHealth(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { accounts: true },
    });

    if (!user) throw new Error("User not found");

    // Verify account belongs to user
    const account = user.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error("Account not found");

    // Current month
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Previous month for comparison
    const lastMonth = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    // Fetch current month transactions
    const currentTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: accountId,
        date: { gte: currentMonthStart, lte: currentMonthEnd },
        status: "COMPLETED",
      },
    });

    // Fetch last 3 months for consistency check
    const threeMonthsAgo = subMonths(now, 3);
    const allRecentTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: accountId,
        date: { gte: threeMonthsAgo, lte: currentMonthEnd },
        status: "COMPLETED",
      },
    });

    // Get budget
    const budget = await db.budget.findUnique({
      where: { userId: user.id },
    });

    const budgetAmount = toNumber(budget?.amount) || 0;

    // ============ CALCULATE COMPONENTS ============

    // 1. SAVINGS RATE (30%)
    const currentIncome = currentTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);

    const currentExpense = currentTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);

    const currentSavings = currentIncome - currentExpense;
    const savingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;

    // Score: 0-30 points
    // Good: 20%+, Excellent: 30%+, Poor: 0-10%
    let savingsRateScore = 0;
    if (savingsRate >= 30) savingsRateScore = 30;
    else if (savingsRate >= 20) savingsRateScore = 25;
    else if (savingsRate >= 10) savingsRateScore = 15;
    else if (savingsRate >= 0) savingsRateScore = 5;
    else savingsRateScore = 0;

    // 2. INCOME-TO-EXPENSE RATIO (25%)
    const incomeToExpenseRatio = currentIncome > 0 ? currentIncome / currentExpense : 0;

    // Score: 0-25 points
    // Good: 1.5+, Excellent: 2+, Poor: <1
    let incomeRatioScore = 0;
    if (incomeToExpenseRatio >= 2) incomeRatioScore = 25;
    else if (incomeToExpenseRatio >= 1.5) incomeRatioScore = 20;
    else if (incomeToExpenseRatio >= 1.2) incomeRatioScore = 15;
    else if (incomeToExpenseRatio >= 1) incomeRatioScore = 10;
    else incomeRatioScore = 0;

    // 3. BUDGET ADHERENCE (20%)
    const budgetUsagePercent = budgetAmount > 0 ? (currentExpense / budgetAmount) * 100 : 100;

    // Score: 0-20 points
    // Perfect: <80%, Good: 80-100%, Fair: 100-120%, Poor: >120%
    let budgetScore = 0;
    if (budgetUsagePercent <= 80) budgetScore = 20;
    else if (budgetUsagePercent <= 100) budgetScore = 18;
    else if (budgetUsagePercent <= 120) budgetScore = 10;
    else budgetScore = 0;

    // 4. EMERGENCY FUND STATUS (15%)
    // Ideally, users should have 3-6 months of expenses saved
    const monthlyAvgExpense = currentExpense;
    const accountBalance = toNumber(account.balance);
    const emergencyFundMonths = monthlyAvgExpense > 0 ? accountBalance / monthlyAvgExpense : 0;

    // Score: 0-15 points
    // Excellent: 6+ months, Good: 3-6 months, Fair: 1-3 months, Poor: <1 month
    let emergencyScore = 0;
    if (emergencyFundMonths >= 6) emergencyScore = 15;
    else if (emergencyFundMonths >= 3) emergencyScore = 12;
    else if (emergencyFundMonths >= 1) emergencyScore = 7;
    else emergencyScore = 0;

    // 5. SPENDING CONSISTENCY (10%)
    // Check if spending varies too much month to month
    const monthlyExpenses = {};
    allRecentTransactions
      .filter((t) => t.type === "EXPENSE")
      .forEach((t) => {
        const month = new Date(t.date).toISOString().slice(0, 7);
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + toNumber(t.amount);
      });

    const expenses = Object.values(monthlyExpenses);
    let spendingConsistencyScore = 0;

    if (expenses.length >= 2) {
      const avgExpense = expenses.reduce((a, b) => a + b) / expenses.length;
      const variance = expenses.reduce((sum, exp) => sum + Math.pow(exp - avgExpense, 2), 0) / expenses.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgExpense > 0 ? (stdDev / avgExpense) * 100 : 0;

      // Score: 0-10 points
      // Consistent: <15% variation, Good: 15-25%, Fair: 25-40%, Poor: >40%
      if (coefficientOfVariation <= 15) spendingConsistencyScore = 10;
      else if (coefficientOfVariation <= 25) spendingConsistencyScore = 8;
      else if (coefficientOfVariation <= 40) spendingConsistencyScore = 5;
      else spendingConsistencyScore = 0;
    }

    // ============ CALCULATE TOTAL SCORE ============
    const totalScore =
      savingsRateScore +
      incomeRatioScore +
      budgetScore +
      emergencyScore +
      spendingConsistencyScore;

    // Determine health status
    let status = "Poor";
    let statusColor = "red";
    if (totalScore >= 80) {
      status = "Excellent";
      statusColor = "green";
    } else if (totalScore >= 65) {
      status = "Very Good";
      statusColor = "blue";
    } else if (totalScore >= 50) {
      status = "Good";
      statusColor = "yellow";
    } else if (totalScore >= 35) {
      status = "Fair";
      statusColor = "orange";
    }

    // Generate recommendations
    const recommendations = generateRecommendations({
      savingsRate,
      incomeRatio: incomeToExpenseRatio,
      budgetUsage: budgetUsagePercent,
      emergencyFundMonths,
      spendingConsistency: expenses.length >= 2 ? 
        100 - (Math.sqrt(expenses.reduce((sum, exp) => sum + Math.pow(exp - (expenses.reduce((a, b) => a + b) / expenses.length), 2), 0) / expenses.length) / (expenses.reduce((a, b) => a + b) / expenses.length) * 100) : 50,
    });

    return {
      success: true,
      healthScore: {
        totalScore: Math.round(totalScore),
        status,
        statusColor,
        breakdown: {
          savingsRate: {
            score: savingsRateScore,
            weight: 30,
            value: savingsRate.toFixed(1),
            label: "Savings Rate",
          },
          incomeRatio: {
            score: incomeRatioScore,
            weight: 25,
            value: incomeToExpenseRatio.toFixed(2),
            label: "Income-to-Expense Ratio",
          },
          budgetAdherence: {
            score: budgetScore,
            weight: 20,
            value: budgetUsagePercent.toFixed(1),
            label: "Budget Adherence",
          },
          emergencyFund: {
            score: emergencyScore,
            weight: 15,
            value: emergencyFundMonths.toFixed(1),
            label: "Emergency Fund (Months)",
          },
          spendingConsistency: {
            score: spendingConsistencyScore,
            weight: 10,
            value: expenses.length >= 2 ? 100 - (Math.sqrt(expenses.reduce((sum, exp) => sum + Math.pow(exp - (expenses.reduce((a, b) => a + b) / expenses.length), 2), 0) / expenses.length) / (expenses.reduce((a, b) => a + b) / expenses.length) * 100) : 50,
            label: "Spending Consistency",
          },
        },
        metrics: {
          currentIncome,
          currentExpense,
          currentSavings,
          budgetAmount,
          accountBalance,
          emergencyFundMonths: emergencyFundMonths.toFixed(1),
        },
        recommendations,
      },
    };
  } catch (error) {
    console.error("Error calculating financial health:", error);
    throw new Error(error.message);
  }
}

/**
 * Generate recommendations based on health metrics
 */
function generateRecommendations(metrics) {
  const recommendations = [];

  // Savings rate recommendations
  if (metrics.savingsRate < 20) {
    recommendations.push({
      priority: "high",
      category: "Savings",
      title: "Increase Savings Rate",
      description: `Your savings rate is ${metrics.savingsRate.toFixed(1)}%. Aim for at least 20%.`,
      action: "Review and reduce non-essential expenses to increase savings.",
    });
  } else if (metrics.savingsRate >= 30) {
    recommendations.push({
      priority: "low",
      category: "Savings",
      title: "Excellent Savings Rate",
      description: `You're saving ${metrics.savingsRate.toFixed(1)}% - keep it up!`,
      action: "Consider investing this extra money for growth.",
    });
  }

  // Income ratio recommendations
  if (metrics.incomeRatio < 1.2) {
    recommendations.push({
      priority: "high",
      category: "Income",
      title: "Increase Income or Reduce Expenses",
      description: "Your expenses are too close to income. Build a safety margin.",
      action: "Look for side income opportunities or further reduce expenses.",
    });
  }

  // Budget recommendations
  if (metrics.budgetUsage > 120) {
    recommendations.push({
      priority: "high",
      category: "Budget",
      title: "You're Over Budget",
      description: `You've spent ${metrics.budgetUsage.toFixed(1)}% of your budget.`,
      action: "Cut unnecessary spending immediately or increase your budget.",
    });
  } else if (metrics.budgetUsage > 100) {
    recommendations.push({
      priority: "medium",
      category: "Budget",
      title: "Approaching Budget Limit",
      description: `You've spent ${metrics.budgetUsage.toFixed(1)}% of your budget.`,
      action: "Be more careful with spending in the remaining days.",
    });
  }

  // Emergency fund recommendations
  if (metrics.emergencyFundMonths < 1) {
    recommendations.push({
      priority: "high",
      category: "Emergency Fund",
      title: "Build Emergency Fund",
      description: "You have less than 1 month of expenses saved.",
      action: "Save at least 3-6 months of expenses as an emergency buffer.",
    });
  } else if (metrics.emergencyFundMonths < 3) {
    recommendations.push({
      priority: "medium",
      category: "Emergency Fund",
      title: "Increase Emergency Fund",
      description: `You have ${metrics.emergencyFundMonths.toFixed(1)} months saved. Aim for 3-6 months.`,
      action: "Gradually increase your emergency fund to 6 months of expenses.",
    });
  }

  // Spending consistency recommendations
  if (metrics.spendingConsistency < 50) {
    recommendations.push({
      priority: "medium",
      category: "Spending",
      title: "Stabilize Your Spending",
      description: "Your spending varies significantly month to month.",
      action: "Create a consistent monthly budget and stick to it.",
    });
  }

  return recommendations;
}

/**
 * Calculate Tax Deduction Report
 */
export async function calculateTaxDeductions(accountId, year) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { accounts: true },
    });

    if (!user) throw new Error("User not found");

    // Verify account
    const account = user.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error("Account not found");

    // Get all transactions for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const yearTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: accountId,
        date: { gte: yearStart, lte: yearEnd },
        status: "COMPLETED",
      },
    });

    // Categorize deductible expenses
    const deductibleCategories = {
      "professional-development": {
        name: "Professional Development",
        description: "Courses, certifications, training",
        percentage: 100,
      },
      "internet-mobile": {
        name: "Internet & Mobile",
        description: "Work-related connectivity",
        percentage: 50,
      },
      travel: {
        name: "Travel",
        description: "Work-related travel",
        percentage: 75,
      },
      "office-supplies": {
        name: "Office Supplies",
        description: "Stationery, equipment",
        percentage: 100,
      },
      software: {
        name: "Software & Tools",
        description: "Work-related software subscriptions",
        percentage: 100,
      },
    };

    // Calculate deductions
    const deductions = {};
    let totalDeductible = 0;

    Object.keys(deductibleCategories).forEach((key) => {
      const category = deductibleCategories[key];
      const categoryExpenses = yearTransactions
        .filter(
          (t) =>
            t.type === "EXPENSE" &&
            (t.category.toLowerCase().includes(key.split("-")[0]) ||
              t.description.toLowerCase().includes(key.split("-")[0]))
        )
        .reduce((sum, t) => sum + toNumber(t.amount), 0);

      const deductionAmount = (categoryExpenses * category.percentage) / 100;
      if (deductionAmount > 0) {
        deductions[key] = {
          name: category.name,
          description: category.description,
          totalExpense: categoryExpenses,
          percentage: category.percentage,
          deductionAmount,
        };
        totalDeductible += deductionAmount;
      }
    });

    // Total income for the year
    const totalYearlyIncome = yearTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);

    // Total expenses
    const totalYearlyExpense = yearTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + toNumber(t.amount), 0);

    return {
      success: true,
      taxReport: {
        year,
        incomeAfterDeduction: totalYearlyIncome - totalDeductible,
        totalIncome: totalYearlyIncome,
        totalExpenses: totalYearlyExpense,
        deductions,
        totalDeductible,
        estimatedTaxSavings: Math.round(totalDeductible * 0.3), // Assuming 30% tax bracket
      },
    };
  } catch (error) {
    console.error("Error calculating tax deductions:", error);
    throw new Error(error.message);
  }
}
