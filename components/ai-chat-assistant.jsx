"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFinanceInsight } from "@/actions/finance-chat";

function ChatAssistantContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "👋 Hi! I'm your AI Finance Assistant. Ask me anything about your spending, budgets, or financial patterns!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleOpenAIChat = (e) => {
      setIsOpen(true);
      setIsMinimized(false);
      // Get accountId from event detail if provided
      if (e.detail?.accountId) {
        setAccountId(e.detail.accountId);
      }
    };

    const handleAccountChange = (e) => {
      // Update accountId when account changes
      if (e.detail?.accountId) {
        setAccountId(e.detail.accountId);
      }
    };

    const handleTransactionCreated = () => {
      // Refresh chat when a new transaction is created
      // This ensures fresh data from the database
      console.log("Transaction created - chat will show fresh data on next query");
    };

    window.addEventListener("openAIChat", handleOpenAIChat);
    window.addEventListener("accountChanged", handleAccountChange);
    window.addEventListener("transactionCreated", handleTransactionCreated);
    
    return () => {
      window.removeEventListener("openAIChat", handleOpenAIChat);
      window.removeEventListener("accountChanged", handleAccountChange);
      window.removeEventListener("transactionCreated", handleTransactionCreated);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Pass accountId to the finance insight function
      const result = await getFinanceInsight(input, accountId);

      if (result.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: "bot",
          text: result.answer,
          timestamp: new Date(),
          stats: {
            transactions: result.transactions,
            spent: result.totalSpent,
          },
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: "bot",
          text: `❌ ${result.message}`,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: `❌ Something went wrong. Please try again.`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return null; // Hidden when closed - controlled by FloatingActionButtons
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 z-40 md:bottom-6 md:right-96 w-64 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-between px-4"
        title="Open Chat"
      >
        <span className="text-sm font-semibold">FintechNest AI</span>
        <Maximize2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-6 md:right-6 w-full max-w-sm h-96 md:h-[600px] bg-gradient-to-b from-white to-gray-50 rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white p-3 md:p-4 flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-40 h-40 bg-white rounded-full -top-20 -right-20" />
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <span className="font-bold text-sm md:text-base">FintechNest AI</span>
            <p className="text-xs text-white/80">Your Finance Assistant</p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-white/20 p-1.5 md:p-2 rounded-lg transition-all"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1.5 md:p-2 rounded-lg transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-xs md:max-w-sm px-3 md:px-4 py-2 md:py-3 rounded-2xl text-sm md:text-base ${
                msg.type === "user"
                  ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-none shadow-lg"
                  : msg.isError
                    ? "bg-gradient-to-br from-red-100 to-red-50 text-red-800 rounded-bl-none border border-red-200 shadow-sm"
                    : "bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-md hover:shadow-lg transition-shadow"
              }`}
            >
              <p className="leading-relaxed text-xs md:text-sm">{msg.text}</p>
              {msg.stats && (
                <div className="text-xs md:text-xs mt-2 opacity-80 bg-white/10 rounded px-2 py-1">
                  📊 Based on {msg.stats.transactions} transactions ({msg.stats.spent} analyzed)
                </div>
              )}
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-bl-none rounded-2xl px-4 py-3 shadow-md">
              <div className="flex gap-2 items-center">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 md:p-4 bg-white">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask about your spending..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1 text-xs md:text-sm rounded-full border-gray-300 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 md:px-4 rounded-full transition-all hover:scale-105 active:scale-95"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AIChatAssistant() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ChatAssistantContent />;
}
