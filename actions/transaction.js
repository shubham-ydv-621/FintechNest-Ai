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

// Scan Receipt using Gemini 2.5 Flash (Free - No Billing Required)
export async function scanReceipt(file) {
  async function callGeminiAPI(base64String, mimeType) {
    try {
      console.log(`[Gemini] Calling Gemini 2.5 Flash API...`);
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[Gemini] API key not configured in Vercel");
        throw new Error("API key missing - check Vercel environment variables");
      }

      console.log(`[Gemini] Using API key: ${apiKey.substring(0, 10)}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Extract transaction details from this receipt image. Return ONLY valid JSON (no markdown, no extra text, just the JSON object): { "amount": number, "date": "YYYY-MM-DD", "description": "string", "category": "shopping", "merchantName": "string" }`,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64String,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      console.log(`[Gemini] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini] API Error ${response.status}:`, errorText.substring(0, 300));
        throw new Error(`Gemini API returned ${response.status}: ${errorText.substring(0, 100)}`);
      }

      return response;
    } catch (error) {
      console.error("[Gemini] Call failed:", error.message);
      throw error;
    }
  }

  try {
    console.log(`[Scan] Starting receipt scan (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    if (!file) throw new Error("No file provided");
    if (file.size > 10 * 1024 * 1024) throw new Error("File exceeds 10MB limit");

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    console.log(`[Scan] File converted to base64 (${(base64String.length / 1024).toFixed(1)}KB)`);

    // REAL API CALL - NO FALLBACK
    const response = await callGeminiAPI(base64String, mimeType);

    const data = await response.json();
    console.log(`[Scan] Response received`, JSON.stringify(data).substring(0, 200));

    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("[Scan] No text in response:", JSON.stringify(data));
      throw new Error("AI returned empty response");
    }

    console.log(`[Scan] Text content: ${textContent.substring(0, 100)}`);
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error("[Scan] No JSON found in text");
      throw new Error("Could not extract JSON from receipt");
    }

    let parsed = JSON.parse(jsonMatch[0]);
    console.log(`[Scan] ✓ SUCCESS - Amount: ${parsed.amount}, Description: ${parsed.description}`);

    return {
      amount: parseFloat(parsed.amount) || 0,
      date: parsed.date ? new Date(parsed.date) : new Date(),
      description: parsed.description || "Receipt",
      category: parsed.category || "shopping",
      merchantName: parsed.merchantName || "Unknown",
    };
  } catch (error) {
    console.error("[Scan] ✗ FAILED:", error.message);
    // THROW ERROR - Don't return mock data
    throw new Error(`Receipt scan failed: ${error.message}`);
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