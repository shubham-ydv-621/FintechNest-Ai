"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceInsight(question) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    console.log(`[Finance Chat] Processing question: ${question.substring(0, 50)}...`);

    // 1. Fetch user transactions (last 100)
    const transactions = await db.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true,
        amount: true,
        category: true,
        description: true,
        date: true,
        type: true,
        merchantName: true,
      },
    });

    if (transactions.length === 0) {
      return {
        success: false,
        message:
          "No transactions found. Start tracking expenses to use AI insights.",
      };
    }

    // 2. Calculate spending statistics for context
    const totalSpent = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const byCategoryMap = {};
    transactions.forEach((t) => {
      if (t.type === "EXPENSE") {
        const cat = t.category || "uncategorized";
        byCategoryMap[cat] = (byCategoryMap[cat] || 0) + parseFloat(t.amount);
      }
    });

    const topCategories = Object.entries(byCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(", ");

    // 3. Format transactions for context
    const recentTransactions = transactions
      .slice(0, 20)
      .map(
        (t) =>
          `${new Date(t.date).toLocaleDateString()}: ${t.category} - $${parseFloat(t.amount).toFixed(2)} (${t.description})`
      )
      .join("\n");

    // 4. Build AI prompt with context
    const prompt = `You are a financial AI advisor analyzing spending patterns.

USER'S RECENT TRANSACTIONS:
${recentTransactions}

SPENDING SUMMARY:
- Total Spent: $${totalSpent.toFixed(2)}
- Top Categories: ${topCategories}
- Transaction Count: ${transactions.length}

USER QUESTION: "${question}"

Instructions:
1. Answer based ONLY on their actual transaction data above
2. Be conversational and friendly
3. Give specific numbers and insights
4. Suggest actionable tips if relevant
5. Keep response concise (2-3 sentences max)

Respond directly without any preamble.`;

    console.log(`[Finance Chat] Built context, calling Mistral API...`);

    // 5. Call Mistral API
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
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[Finance Chat] API Error:", error);
      throw new Error("Failed to get AI insight");
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || "";

    if (!answer) {
      throw new Error("No response from AI");
    }

    console.log(`[Finance Chat] ✓ Success: ${answer.substring(0, 50)}...`);

    return {
      success: true,
      answer,
      transactions: transactions.length,
      totalSpent: totalSpent.toFixed(2),
    };
  } catch (error) {
    console.error("[Finance Chat] Error:", error.message);
    return {
      success: false,
      message: error.message || "Failed to process your question",
    };
  }
}
