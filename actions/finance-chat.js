"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceInsight(question) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) throw new Error("Unauthorized");
    if (!question?.trim()) throw new Error("Question is required");

    console.log(
      `[Finance Chat] Processing: ${question.slice(0, 80)}`
    );

    // =========================
    // GET USER
    // =========================
    const dbUser = await db.user.findUnique({
      where: { clerkUserId },
    });

    if (!dbUser) throw new Error("User not found");

    // =========================
    // FETCH DATA (optimized)
    // =========================
    const transactions = await db.transaction.findMany({
      where: { userId: dbUser.id },
      orderBy: { date: "desc" },
      take: 120,
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
    // BASIC NORMALIZATION
    // =========================
    const lower = question.toLowerCase();

    // smart intent detection
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

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c, v]) => `${c}: $${v.toFixed(2)}`)
      .join(" | ");

    // =========================
    // REDUCED CONTEXT (IMPORTANT OPTIMIZATION)
    // =========================
    const contextTransactions = transactions
      .slice(0, 15)
      .map(
        t =>
          `${t.date.toISOString().split("T")[0]} | ${t.category} | $${t.amount} | ${t.type}`
      )
      .join("\n");

    // =========================
    // FINAL PROMPT (CLEAN + STRUCTURED)
    // =========================
    const prompt = `
You are FintechNest AI — a premium financial intelligence assistant.

Answer ONLY using provided data.

====================
USER DATA
====================
Balance: $${balance.toFixed(2)}
Income: $${totalIncome.toFixed(2)}
Spent: $${totalSpent.toFixed(2)}

Top Categories:
${topCategories}

Recent Transactions:
${contextTransactions}

====================
QUESTION
====================
${question}

====================
RESPONSE FORMAT (STRICT)
====================

📊 Summary:
- ...

💰 Key Numbers:
- Spent:
- Income:
- Balance:

📂 Breakdown:
- ...

💡 Insight:
- ...

⚠️ Advice:
- (only if needed)

RULES:
- Be extremely concise
- No long paragraphs
- No hallucination
- Use numbers when possible
- Keep professional fintech tone
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
                "You are a strict financial AI that gives structured, precise answers.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
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
      message:
        error?.message || "Something went wrong",
    };
  }
}