"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Mistral } from "@mistralai/mistralai";
import { startOfMonth, endOfMonth } from "date-fns";
import { calculateFinancialHealth, calculateTaxDeductions } from "./financial-health";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

/**
 * Safely converts Decimal fields to numbers if needed
 */
const serializeData = (obj) => {
  if (!obj) return obj;
  const serialized = { ...obj };

  if (obj.balance !== undefined && obj.balance !== null) {
    serialized.balance =
      typeof obj.balance === "object" && typeof obj.balance.toNumber === "function"
        ? obj.balance.toNumber()
        : obj.balance;
  }

  if (obj.amount !== undefined && obj.amount !== null) {
    serialized.amount =
      typeof obj.amount === "object" && typeof obj.amount.toNumber === "function"
        ? obj.amount.toNumber()
        : obj.amount;
  }

  return serialized;
};

/**
 * Generate monthly financial report data
 */
export async function generateMonthlyReport(year, month, accountId) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: { accounts: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify account belongs to user
    const account = user.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error("Account not found or unauthorized");
    }

    // Calculate date range for the month
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // Fetch all transactions for the month
    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        accountId: accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: "COMPLETED",
      },
      orderBy: { date: "desc" },
    });

    // Calculate metrics
    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + (t.amount?.toNumber ? t.amount.toNumber() : t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + (t.amount?.toNumber ? t.amount.toNumber() : t.amount), 0);

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Category breakdown
    const categoryBreakdown = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => {
        const amount = t.amount?.toNumber ? t.amount.toNumber() : t.amount;
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += amount;
        return acc;
      }, {});

    const sortedCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }));

    // Get budget info if exists
    const budget = await db.budget.findUnique({
      where: { userId: user.id },
    });

    const budgetAmount = budget?.amount?.toNumber ? budget.amount.toNumber() : budget?.amount || 0;
    const budgetStatus = budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0;

    // Generate AI suggestions using Mistral
    const aiSuggestions = await generateAISuggestions({
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      topCategories: sortedCategories.slice(0, 5),
      budgetStatus,
      budgetAmount,
    });

    // Calculate financial health score
    const healthScoreResponse = await calculateFinancialHealth(accountId);
    const healthScore = healthScoreResponse.success ? healthScoreResponse.healthScore : null;

    // Calculate tax deductions for the year
    const currentYear = new Date().getFullYear();
    const taxResponse = await calculateTaxDeductions(accountId, currentYear);
    const taxReport = taxResponse.success ? taxResponse.taxReport : null;

    // Serialize transactions
    const serializedTransactions = transactions.map(serializeData);

    return {
      success: true,
      reportData: {
        period: {
          year,
          month,
          monthName: new Date(year, month - 1).toLocaleString("default", { month: "long" }),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        accountName: account.name,
        metrics: {
          totalIncome,
          totalExpense,
          netSavings,
          savingsRate,
          budgetAmount,
          budgetStatus,
        },
        categoryBreakdown: sortedCategories,
        transactions: serializedTransactions,
        aiSuggestions,
        healthScore,
        taxReport,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error(error.message || "Failed to generate report");
  }
}

/**
 * Generate AI suggestions using Mistral
 */
async function generateAISuggestions(data) {
  try {
    const {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      topCategories,
      budgetStatus,
      budgetAmount,
    } = data;

    const prompt = `You are a financial advisor. Analyze this spending data and provide 3-4 specific, actionable money-saving suggestions.

Financial Summary:
- Monthly Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Net Savings: ₹${netSavings.toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Budget Status: ${budgetStatus.toFixed(1)}% of ₹${budgetAmount}

Top Spending Categories:
${topCategories
  .slice(0, 5)
  .map((cat) => `- ${cat.category}: ₹${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`)
  .join("\n")}

For each suggestion, provide in this exact JSON format:
{
  "suggestions": [
    {
      "title": "Short title",
      "category": "category name",
      "currentSpending": number,
      "actions": ["action 1", "action 2", "action 3"],
      "potentialSavings": number,
      "difficulty": "Easy/Moderate/Hard",
      "timeframe": "Immediate/Short-term/Long-term"
    }
  ]
}

Be specific, realistic, and personalized to the data. Focus on actionable steps.`;

    const message = await mistral.chat.complete({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.choices[0]?.message?.content || "[]";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.suggestions || [];
    }

    return [];
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return [];
  }
}
