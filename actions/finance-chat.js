"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceInsight(question) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) throw new Error("Unauthorized");
    if (!question?.trim()) throw new Error("Question is required");

    const lower = question.toLowerCase();

    // =========================
    // GET USER
    // =========================
    const dbUser = await db.user.findUnique({
      where: { clerkUserId },
    });

    if (!dbUser) throw new Error("User not found");

    // =========================
    // FETCH TRANSACTIONS (LIMITED FOR AI CONTEXT CONTROL)
    // =========================
    const transactions = await db.transaction.findMany({
      where: { userId: dbUser.id },
      orderBy: { date: "desc" },
      take: 100,
      select: {
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
        message: "No transactions found yet.",
      };
    }

    // =========================
    // BASIC ANALYSIS FLAGS
    // =========================
    const isBalanceQuery = lower.includes("balance");
    const isSpentQuery = lower.includes("spent") || lower.includes("spend");
    const isCategoryQuery = lower.includes("category");

    // =========================
    // CALCULATIONS
    // =========================
    const expenses = transactions.filter(t => t.type === "EXPENSE");
    const income = transactions.filter(t => t.type === "INCOME");

    const totalSpent = expenses.reduce(
      (s, t) => s + Number(t.amount || 0),
      0
    );

    const totalIncome = income.reduce(
      (s, t) => s + Number(t.amount || 0),
      0
    );

    const balance = totalIncome - totalSpent;

    // =========================
    // CATEGORY BREAKDOWN
    // =========================
    const categoryMap = {};

    expenses.forEach(t => {
      const cat = t.category || "Other";
      categoryMap[cat] =
        (categoryMap[cat] || 0) + Number(t.amount || 0);
    });

    const sortedCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1]);

    const topCategories = sortedCategories
      .slice(0, 5)
      .map(([c, v]) => `${c}: $${v.toFixed(2)}`)
      .join(" | ");

    const leastCategory =
      sortedCategories.length > 0
        ? sortedCategories[sortedCategories.length - 1]
        : null;

    // =========================
    // MINIMAL TRANSACTION CONTEXT (IMPORTANT)
    // =========================
    const contextTransactions = transactions
      .slice(0, 12)
      .map(
        t =>
          `${t.date.toISOString().split("T")[0]} | ${t.category} | $${t.amount} | ${t.type}`
      )
      .join("\n");

    // =========================
    // STRONG STRUCTURED PROMPT (KEY FIX)
    // =========================
    const prompt = `
You are FintechNest AI, a strict financial data analyst.

You MUST respond ONLY in the format below.

DO NOT write paragraphs.
DO NOT use stars (**), markdown essays, or long explanations.

====================
DATA
====================

Balance: $${balance.toFixed(2)}
Income: $${totalIncome.toFixed(2)}
Spent: $${totalSpent.toFixed(2)}

Top Categories:
${topCategories}

Least Category:
${leastCategory ? `${leastCategory[0]}: $${leastCategory[1].toFixed(2)}` : "N/A"}

Recent Transactions:
${contextTransactions}

====================
QUESTION
====================
${question}

====================
OUTPUT FORMAT (STRICT)
====================

📊 Summary
- Total Spent:
- Total Income:
- Balance:

💰 Key Insights
- Main spending category:
- Least spending category:

📂 Category Table
| Category | Amount |

💡 Insight
- One short financial insight only

⚠️ Advice
- Only if needed (1 line max)

RULES:
- NEVER use paragraphs
- NEVER use markdown bold (**)
- ALWAYS use table for categories
- ALWAYS be concise
- ALWAYS use numbers from data only
`;

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
                "You are a strict financial data engine that ONLY outputs structured tables and bullet points.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 350,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Error:", err);
      throw new Error("AI service failed");
    }

    const data = await response.json();

    const answer =
      data?.choices?.[0]?.message?.content?.trim();

    return {
      success: true,
      answer,
      stats: {
        transactions: transactions.length,
        spent: totalSpent.toFixed(2),
        income: totalIncome.toFixed(2),
        balance: balance.toFixed(2),
      },
    };
  } catch (error) {
    console.error("[Finance AI Error]", error);

    return {
      success: false,
      message: error?.message || "Something went wrong",
    };
  }
}