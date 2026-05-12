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
    // FETCH TRANSACTIONS
    // =========================
    const transactions = await db.transaction.findMany({
      where: { userId: dbUser.id },
      orderBy: { date: "desc" },
      take: 80, // reduced for stability
      select: {
        amount: true,
        category: true,
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
    // CATEGORY ANALYSIS
    // =========================
    const map = {};

    expenses.forEach(t => {
      const cat = (t.category || "Other").toLowerCase();
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

    const topCategories = sorted
      .slice(0, 5)
      .map(([c, v]) => `${c}: $${v.toFixed(2)}`)
      .join("\n");

    const leastCategory =
      sorted.length > 0 ? sorted[sorted.length - 1] : null;

    // =========================
    // SAFE CONTEXT (SMALL + CLEAN)
    // =========================
    const context = transactions
      .slice(0, 10)
      .map(
        t =>
          `${t.date.toISOString().split("T")[0]} | ${t.category} | $${t.amount} | ${t.type}`
      )
      .join("\n");

    // =========================
    // FINAL PROMPT (FORCED STRUCTURE)
    // =========================
    const prompt = `
You are FintechNest AI.

You MUST respond in STRICT format ONLY.

❌ No paragraphs
❌ No bold text (**)
❌ No extra commentary

====================
DATA
====================

Balance: ${balance.toFixed(2)}
Income: ${totalIncome.toFixed(2)}
Spent: ${totalSpent.toFixed(2)}

Top Categories:
${topCategories}

Least Category:
${leastCategory ? `${leastCategory[0]}: $${leastCategory[1].toFixed(2)}` : "N/A"}

Recent:
${context}

QUESTION:
${question}

====================
OUTPUT FORMAT
====================

📊 Summary
- Spent:
- Income:
- Balance:

📂 Category Table
Category | Amount
---------

💰 Key Insight
- one line only

💡 Advice
- one line only (optional)

RULES:
- ONLY use given data
- MUST use table format
- MUST be short
`;

    // =========================
    // AI CALL WITH TIMEOUT SAFETY
    // =========================
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let answer = "";

    try {
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
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
                  "You are a strict financial engine that outputs only structured tables and bullet points.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.2,
            max_tokens: 300,
          }),
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      answer =
        data?.choices?.[0]?.message?.content?.trim();
    } catch (err) {
      console.error("AI fallback triggered:", err.message);

      // =========================
      // FALLBACK RESPONSE (IMPORTANT FIX)
      // =========================
      answer = `
📊 Summary
- Spent: ${totalSpent.toFixed(2)}
- Income: ${totalIncome.toFixed(2)}
- Balance: ${balance.toFixed(2)}

📂 Category Table
${sorted.map(([c, v]) => `${c} | $${v.toFixed(2)}`).join("\n")}

💡 Insight
- Your highest spending is ${sorted[0]?.[0] || "N/A"}.
      `.trim();
    }

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