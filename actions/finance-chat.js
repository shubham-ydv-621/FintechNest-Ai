"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceInsight(question) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    if (!question || question.trim().length === 0) {
      throw new Error("Question is required");
    }

    console.log(
      `[Finance Chat] Processing question: ${question.substring(0, 80)}`
    );

    // =========================
    // GET REAL DATABASE USER
    // =========================

    const dbUser = await db.user.findUnique({
      where: {
        clerkUserId,
      },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // =========================
    // FETCH TRANSACTIONS
    // =========================

    const transactions = await db.transaction.findMany({
      where: {
        userId: dbUser.id,
      },
      orderBy: {
        date: "desc",
      },
      take: 150,
      select: {
        id: true,
        amount: true,
        category: true,
        description: true,
        date: true,
        type: true,
      },
    });

    if (!transactions.length) {
      return {
        success: false,
        message:
          "No transactions found yet. Add some transactions first.",
      };
    }

    // =========================
    // FILTERS
    // =========================

    const lowerQuestion = question.toLowerCase();

    const categories = [
      "food",
      "shopping",
      "transport",
      "entertainment",
      "health",
      "travel",
      "education",
      "bills",
      "groceries",
      "salary",
    ];

    let detectedCategory = null;

    for (const cat of categories) {
      if (lowerQuestion.includes(cat)) {
        detectedCategory = cat;
        break;
      }
    }

    let filteredTransactions = transactions;

    if (detectedCategory) {
      const matched = transactions.filter((t) =>
        (t.category || "")
          .toLowerCase()
          .includes(detectedCategory)
      );

      if (matched.length > 0) {
        filteredTransactions = matched;
      }
    }

    // =========================
    // CALCULATIONS
    // =========================

    const expenseTransactions = transactions.filter(
      (t) => t.type === "EXPENSE"
    );

    const incomeTransactions = transactions.filter(
      (t) => t.type === "INCOME"
    );

    const totalSpent = expenseTransactions.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const currentBalance = totalIncome - totalSpent;

    // =========================
    // CATEGORY ANALYTICS
    // =========================

    const byCategoryMap = {};

    expenseTransactions.forEach((t) => {
      const cat = t.category || "Uncategorized";

      byCategoryMap[cat] =
        (byCategoryMap[cat] || 0) + Number(t.amount || 0);
    });

    const topCategories = Object.entries(byCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(
        ([cat, amount]) =>
          `${cat}: $${Number(amount).toFixed(2)}`
      )
      .join(", ");

    // =========================
    // RECENT TRANSACTIONS
    // =========================

    const recentTransactions = filteredTransactions
      .slice(0, 25)
      .map((t) => {
        return `
Date: ${new Date(t.date).toLocaleDateString()}
Category: ${t.category || "Unknown"}
Amount: $${Number(t.amount || 0).toFixed(2)}
Type: ${t.type}
Description: ${t.description || "No description"}
`;
      })
      .join("\n");

    // =========================
    // BUILD PROMPT
    // =========================

    const prompt = `
You are FintechNest AI, an intelligent financial assistant.

Analyze ONLY the financial data below and answer the user's question accurately.

=========================
USER FINANCIAL DATA
=========================

Current Balance: $${currentBalance.toFixed(2)}

Total Income: $${totalIncome.toFixed(2)}

Total Expenses: $${totalSpent.toFixed(2)}

Transaction Count: ${transactions.length}

Top Spending Categories:
${topCategories}

Recent Transactions:
${recentTransactions}

=========================
USER QUESTION
=========================

"${question}"

=========================
RULES
=========================

1. Use ONLY the provided financial data
2. Give exact spending values when possible
3. Keep response concise and premium
4. Give intelligent financial insights
5. Never hallucinate fake transactions
6. Sound like a smart fintech AI assistant

Respond naturally.
`;

    console.log("[Finance Chat] Calling Mistral API");

    // =========================
    // AI CALL
    // =========================

    const response = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-small",
          messages: [
            {
              role: "system",
              content:
                "You are an advanced AI financial assistant.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("[Finance Chat] API Error:", errorText);

      throw new Error("AI service failed");
    }

    const data = await response.json();

    const answer =
      data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("No AI response generated");
    }

    console.log(
      `[Finance Chat] Success: ${answer.substring(0, 80)}...`
    );

    return {
      success: true,
      answer,
      stats: {
        totalTransactions: transactions.length,
        totalSpent: totalSpent.toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        currentBalance: currentBalance.toFixed(2),
      },
    };
  } catch (error) {
    console.error("[Finance Chat] Error:", error);

    return {
      success: false,
      message:
        error?.message ||
        "Failed to process finance AI request",
    };
  }
}