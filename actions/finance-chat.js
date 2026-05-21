"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =====================================================
// HELPER: Analyze question relevance
// =====================================================
function analyzeQuestion(question) {
  const q = question.toLowerCase();
  
  return {
    isBalance: /balance|how much|total/.test(q),
    isSpending: /spend|spent|expense|cost|how much.*spend/.test(q),
    isIncome: /income|earn|earned|make/.test(q),
    isCategory: /category|where|spent on|spending on|on what/.test(q),
    isRecommendation: /advice|should|recommend|help|improve|cut down/.test(q),
    isComparison: /compare|vs|versus|more|less|highest/.test(q),
    isTrend: /trend|pattern|history|over time/.test(q),
    isRecentTransaction: /most recent|recent transaction|latest/.test(q),
  };
}

// =====================================================
// HELPER: Format currency
// =====================================================
function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// =====================================================
// HELPER: Build category table
// =====================================================
function buildCategoryTable(categories) {
  if (!categories.length) return "No category data available.";
  
  const rows = categories.map(([name, amount]) => 
    `${name.padEnd(15)} | ${formatCurrency(amount).padStart(10)}`
  );
  
  return [
    "Category        | Amount",
    "─────────────────────────",
    ...rows
  ].join("\n");
}

// =====================================================
// HELPER: Generate smart answer based on question type
// =====================================================
function generateSmartAnswer(question, data) {
  const analysis = analyzeQuestion(question);
  const { totalSpent, totalIncome, balance, topExpenses, recentTransactions, allExpenses } = data;

  // Simple balance question
  if (analysis.isBalance && !analysis.isSpending && !analysis.isIncome) {
    return `Your current balance is ${formatCurrency(balance)}.\n\n(Income: ${formatCurrency(totalIncome)} − Spent: ${formatCurrency(totalSpent)})`;
  }

  // Simple spending question
  if (analysis.isSpending && !analysis.isCategory && !analysis.isRecommendation) {
    return `You've spent ${formatCurrency(totalSpent)} across all transactions.\n\nTop spending categories:\n${buildCategoryTable(topExpenses.slice(0, 3))}`;
  }

  // Simple income question
  if (analysis.isIncome && !analysis.isSpending) {
    return `Your total income is ${formatCurrency(totalIncome)}.`;
  }

  // Category breakdown
  if (analysis.isCategory) {
    return `Breakdown of your expenses by category:\n\n${buildCategoryTable(topExpenses)}`;
  }

  // Comparison/Highest spending
  if (analysis.isComparison || analysis.isSpending && analysis.isCategory) {
    if (!topExpenses.length) return "No expense data to compare.";
    return `Your spending breakdown:\n\n${buildCategoryTable(topExpenses)}\n\nHighest: ${topExpenses[0][0]} (${formatCurrency(topExpenses[0][1])})`;
  }

  // Most recent transaction
  if (analysis.isRecentTransaction) {
    if (!recentTransactions || recentTransactions.length === 0) {
      return "No recent transactions found.";
    }
    const recent = recentTransactions[0];
    const dateStr = new Date(recent.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    return `Your most recent transaction:\n\nDate: ${dateStr}\nCategory: ${recent.category}\nAmount: ${formatCurrency(recent.amount)}\nType: ${recent.type}`;
  }

  // Recommendations
  if (analysis.isRecommendation) {
    if (!topExpenses.length) return "No data available for recommendations.";
    const highest = topExpenses[0];
    const avg = totalSpent / allExpenses.length;
    return `Based on your spending:\n\n• Your highest spending is in "${highest[0]}" at ${formatCurrency(highest[1])}\n• Average transaction: ${formatCurrency(avg)}\n• Consider reviewing "${highest[0]}" expenses to optimize your budget`;
  }

  // Default: comprehensive summary
  return `Financial Summary:\n\nIncome:        ${formatCurrency(totalIncome)}\nSpent:         ${formatCurrency(totalSpent)}\nBalance:       ${formatCurrency(balance)}\n\nTop Categories:\n${buildCategoryTable(topExpenses.slice(0, 5))}`;
}

// =====================================================
// MAIN FUNCTION
// =====================================================
export async function getFinanceInsight(question, accountId) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) throw new Error("Unauthorized");
    if (!question?.trim()) throw new Error("Please ask a question about your finances");

    // =========================
    // EASTER EGG: Adwin Yadav
    // =========================
    if (question.toLowerCase().includes("adwin yadav")) {
      return {
        success: true,
        answer: `🎉 Hahaha Adduuuu! 😂

Adwin Yadav - aka "Adduu" is a retired Sutherland's Professional, currently serving at Aadi Fast Food and is our beloved "BHAI"! 💪

Here's the real tea ☕:
• Investment Expert: Invests money in "Bhajichara" but bhai never gets returns (bahut common thing 😅)
• FintechNest AI Super User: Active user of FintechNest-AI due to high finances and hard to manage expenses
• Geography: Certified Chennai Mallu & Certified Anna! 🌴
• Current Status: Managing finances like a pro with our platform

Basically, Adduuu needs FintechNest-AI to track all his "lost investments" and "fast food expenses" 🍔💸

P.S. - Bhai, your secrets are safe with AI! 🤐`,
        stats: {
          transactions: "∞ (Lost investments)",
          spent: "$Bhajichara",
          income: "Secret 🤐",
          balance: "Emotional Balance only 😄",
        },
      };
    }

    // =========================
    // GET USER & TRANSACTIONS
    // =========================
    const dbUser = await db.user.findUnique({
      where: { clerkUserId },
    });

    if (!dbUser) throw new Error("User not found");

    // If no accountId provided, get the default account
    let filterAccountId = accountId;
    if (!filterAccountId) {
      const defaultAccount = await db.account.findFirst({
        where: { userId: dbUser.id, isDefault: true },
      });
      filterAccountId = defaultAccount?.id;
    }

    // Build transaction filter with accountId
    const txFilter = { userId: dbUser.id };
    if (filterAccountId) {
      txFilter.accountId = filterAccountId;
    }

    // Always fetch fresh data - no caching
    const transactions = await db.transaction.findMany({
      where: txFilter,
      orderBy: { date: "desc" },
      take: 100,
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
        message: "No transactions found. Start adding transactions to get insights.",
      };
    }

    // =========================
    // CALCULATE DATA
    // =========================
    const expenses = transactions.filter(t => t.type === "EXPENSE");
    const income = transactions.filter(t => t.type === "INCOME");

    const totalSpent = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalIncome = income.reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = totalIncome - totalSpent;

    // =========================
    // CATEGORY ANALYSIS
    // =========================
    const categoryMap = {};
    expenses.forEach(t => {
      const cat = (t.category || "Other").toLowerCase();
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
    });

    const topExpenses = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1]);

    // =========================
    // TRY AI ANSWER FIRST
    // =========================
    let answer = "";
    const timeoutDuration = 10000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      const systemPrompt = `You are FintechNest AI, a professional financial assistant. 
Answer questions directly and concisely. Use tables only when listing multiple items.
Be professional, avoid excessive emojis. Give only what is asked, nothing more.
If the question is not related to financial data provided, say: "This question isn't related to your financial data. However, I can help with: [general advice]"
Keep answers brief and readable on first sight.`;

      const userPrompt = `User's Financial Data:
- Total Income: ${formatCurrency(totalIncome)}
- Total Spent: ${formatCurrency(totalSpent)}
- Balance: ${formatCurrency(balance)}
- Top Expense Categories: ${topExpenses.slice(0, 5).map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`).join(", ")}
- Transaction Count: ${transactions.length}

User Question: "${question}"

Answer the question directly. Be professional and concise.`;

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
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 400,
          }),
        }
      );

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        answer = data?.choices?.[0]?.message?.content?.trim() || "";
      }
    } catch (err) {
      console.error("AI call failed:", err.message);
    }

    // =========================
    // FALLBACK: Smart local answer
    // =========================
    if (!answer) {
      answer = generateSmartAnswer(question, {
        totalSpent,
        totalIncome,
        balance,
        topExpenses,
        recentTransactions: transactions,
        allExpenses: expenses,
      });
    }

    // Revalidate chat data path to ensure fresh data on next fetch
    revalidatePath("/");

    return {
      success: true,
      answer,
      stats: {
        transactions: transactions.length,
        spent: formatCurrency(totalSpent),
        income: formatCurrency(totalIncome),
        balance: formatCurrency(balance),
      },
    };
  } catch (error) {
    console.error("[Finance AI Error]", error);

    return {
      success: false,
      message: error?.message || "Unable to process your question. Please try again.",
    };
  }
}