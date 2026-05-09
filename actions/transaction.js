"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Scan Receipt using Claude API with fallback to mock
export async function scanReceipt(file) {
  const MAX_RETRIES = 1;
  const RETRY_DELAY = 500;

  async function callClaudeAPI(base64String, mimeType, retryCount = 0) {
    try {
      console.log(`[Claude] Attempt ${retryCount + 1}/${MAX_RETRIES + 1}...`);
      
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) {
        console.error("[Claude] API key not configured");
        throw new Error("API_KEY_MISSING");
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: base64String,
                  },
                },
                {
                  type: "text",
                  text: `Extract transaction details from this receipt image. Return ONLY valid JSON (no markdown, no extra text, just the JSON object): { "amount": number, "date": "YYYY-MM-DD", "description": "string", "category": "shopping", "merchantName": "string" }`,
                },
              ],
            },
          ],
        }),
      });

      console.log(`[Claude] Response status: ${response.status}`);

      // Check for billing/credit issues
      if (response.status === 400 || response.status === 401 || response.status === 429) {
        const errorData = await response.text();
        console.warn(`[Claude] ${response.status} Error:`, errorData.substring(0, 150));
        throw new Error("CLAUDE_UNAVAILABLE");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Claude] Error: ${response.status} - ${errorText.substring(0, 150)}`);
        throw new Error(`Claude API Error ${response.status}`);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Fallback: Mock receipt data for demo (when API unavailable)
  function generateMockReceiptData() {
    console.log("[Scan] Claude API unavailable, using demo data");
    
    // Simulate OCR analysis with realistic variations
    const amounts = [45.99, 128.50, 76.25, 312.00, 89.99];
    const merchants = ["Starbucks", "Walmart", "Amazon", "Target", "Best Buy"];
    const categories = ["shopping", "food", "entertainment", "utilities"];
    
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    const randomMerchant = merchants[Math.floor(Math.random() * merchants.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return {
      amount: randomAmount,
      date: new Date(),
      description: `Purchase at ${randomMerchant}`,
      category: randomCategory,
      merchantName: randomMerchant,
    };
  }

  try {
    console.log(`[Scan] Starting receipt scan (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File exceeds 10MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    console.log(`[Scan] File converted to base64 (${(base64String.length / 1024).toFixed(1)}KB)`);

    let response;
    let usedMockData = false;

    try {
      response = await callClaudeAPI(base64String, mimeType);
    } catch (error) {
      if (error.message === "CLAUDE_UNAVAILABLE") {
        console.warn("[Scan] Claude API unavailable (billing required). Using demo data for testing.");
        usedMockData = true;
        const mockData = generateMockReceiptData();
        
        // Add note that this is demo data
        return {
          ...mockData,
          description: "⚠️ Demo Data - " + mockData.description,
        };
      } else if (error.message === "API_KEY_MISSING") {
        throw new Error("Receipt scanning not configured. Please contact support.");
      } else {
        throw error;
      }
    }

    const data = await response.json();
    console.log(`[Scan] Response received and parsed`);

    const textContent = data?.content?.[0]?.text;

    if (!textContent) {
      console.error("[Scan] No text in response:", JSON.stringify(data).substring(0, 200));
      throw new Error("No response from Claude API");
    }

    console.log(`[Scan] Text content extracted, parsing JSON...`);
    
    // Extract JSON from response (Claude sometimes wraps it)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Scan] No JSON found in response:", textContent.substring(0, 200));
      throw new Error("Could not extract JSON from receipt");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[Scan] JSON parse error:", parseError.message);
      throw new Error("Invalid JSON format in response");
    }

    console.log(`[Scan] ✓ Successfully extracted - Amount: ${parsed.amount}`);

    return {
      amount: parseFloat(parsed.amount) || 0,
      date: parsed.date ? new Date(parsed.date) : new Date(),
      description: parsed.description || "Receipt",
      category: parsed.category || "shopping",
      merchantName: parsed.merchantName || "Unknown",
    };
  } catch (error) {
    console.error("[Scan] ✗ Failed:", error.message);
    throw new Error(error?.message || "Failed to scan receipt");
  }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);  
      break;
    case "YEARLY": 
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}