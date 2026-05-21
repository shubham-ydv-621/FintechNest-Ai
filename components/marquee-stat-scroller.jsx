"use client";

import React from "react";

const MarqueeStatScroller = () => {
  const stats = [
    "✨ AI-Powered Receipt Scanner",
    "🌍 500+ Users Across 25+ Countries",
    "🔐 Secure Authentication & DDoS Protection",
    "🤖 AI Chat Assistant",
    "📊 Real-time Financial Analytics",
    "🛡️ Enterprise-Grade Security",
    "📈 Multi-Account Tracking",
    "📉 Monthly Report Download",
    "⚡ 99.9% Uptime Guaranteed",
    "🚀 Advanced Bot Protection",
  ];

  const statsText = stats.join(" • ");

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 py-3 mb-6 rounded-xl shadow-lg border border-blue-400/30">
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .marquee-content {
          display: inline-block;
          animation: scroll 35s linear infinite;
          white-space: nowrap;
          padding-right: 50px;
        }
        .marquee-content:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="marquee-container">
        <div className="marquee-content text-white text-sm md:text-base font-medium tracking-wide">
          {statsText}
        </div>
        <div className="marquee-content text-white text-sm md:text-base font-medium tracking-wide" aria-hidden="true">
          {statsText}
        </div>
      </div>
    </div>
  );
};

export default MarqueeStatScroller;
