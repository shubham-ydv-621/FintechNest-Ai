"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceInsight(question) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (!question || question.trim().length === 0) {
      throw new Error("Question is required");
    }

    console.log(
      `[Finance Chat] Processing question: ${question.substring(0, 80)}`
    );

    // =========================
    // SMART CONTEXT DETECTION
    // =========================

    const lowerQuestion = question.toLowerCase();

    let categoryFilter = null;

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

    for (const cat of categories) {
      if (lowerQuestion.includes(cat)) {
        categoryFilter = cat;
        break;
      }
    }

    // =========================
    // FETCH TRANSACTIONS
    // =========================

    const transactions = await db.transaction.findMany({
      where: {
        userId,
        ...(categoryFilter && {
          category: {
            contains: categoryFilter,
            mode: "insensitive",
          },
        }),
      },
      orderBy: {
        date: "desc",
      },
      take: 100,
      select: {
        id: true,
        amount: true,
        category: true,
        description: true,
        date: true,
        type: true,
      },
    });

    if (transactions.length === 0) {
      return {
        success: false,
        message:
          "No matching transactions found for your query. Try adding more transactions first.",
      };
    }

    // =========================
    // CALCULATE INSIGHTS
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

    const byCategoryMap = {};

    expenseTransactions.forEach((t) => {
      const cat = t.category || "Uncategorized";

      byCategoryMap[cat] =
        (byCategoryMap[cat] || 0) + Number(t.amount || 0);
    });

    const topCategories = Object.entries(byCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(", ");

    // =========================
    // FORMAT TRANSACTIONS
    // =========================

    const recentTransactions = transactions
      .slice(0, 20)
      .map((t) => {
        return `
${new Date(t.date).toLocaleDateString()}
Category: ${t.category || "Unknown"}
Amount: $${Number(t.amount || 0).toFixed(2)}
Type: ${t.type}
Description: ${t.description || "No description"}
`;
      })
      .join("\n");

    // =========================
    // BUILD AI PROMPT
    // =========================

    const prompt = `
You are FintechNest AI, an advanced financial intelligence assistant.

Your job is to analyze user spending behavior and answer based ONLY on the financial data provided below.

=========================
USER FINANCIAL DATA
=========================

Recent Transactions:
${recentTransactions}

Financial Summary:
- Total Expenses: $${totalSpent.toFixed(2)}
- Total Income: $${totalIncome.toFixed(2)}
- Transaction Count: ${transactions.length}
- Top Spending Categories: ${topCategories}

=========================
USER QUESTION
=========================

${question}

=========================
INSTRUCTIONS
=========================

1. Answer ONLY using the provided financial data
2. Be conversational, intelligent, and concise
3. Mention exact spending numbers when relevant
4. Give financial insights or suggestions if useful
5. Keep responses within 2-4 sentences
6. Do not hallucinate missing financial information
7. Sound like a premium fintech AI assistant

Respond directly.
`;

    console.log("[Finance Chat] Context built successfully");

    // =========================
    // CALL MISTRAL API
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
                "You are FintechNest AI, an intelligent financial assistant that provides analytical insights about user spending patterns.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("[Finance Chat] API Error:", errorText);

      throw new Error("AI service failed to respond");
    }

    const data = await response.json();

    const answer = data?.choices?.[0]?.message?.content?.trim();

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
      },
    };
  } catch (error) {
    console.error("[Finance Chat] Error:", error);

    return {
      success: false,
      message:
        error?.message || "Failed to process finance AI request",
    };
  }
}