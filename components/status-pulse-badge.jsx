"use client";

import React, { useEffect, useState } from "react";

const StatusPulseBadge = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: "🟢",
      text: "System Active & Monitoring Your Finances",
      subtext: "Real-time AI Analysis Running",
      gradientFrom: "from-blue-400",
      gradientTo: "to-cyan-500",
      borderColor: "border-blue-300/40",
    },
    {
      icon: "🤖",
      text: "AI Chat Assistant Online",
      subtext: "24/7 Financial Support Available",
      gradientFrom: "from-blue-500",
      gradientTo: "to-purple-500",
      borderColor: "border-blue-300/40",
    },
    {
      icon: "🛡️",
      text: "Enterprise Security Active",
      subtext: "DDoS & Bot Protection Enabled",
      gradientFrom: "from-cyan-400",
      gradientTo: "to-blue-600",
      borderColor: "border-cyan-300/40",
    },
    {
      icon: "⚡",
      text: "99.9% Uptime Maintained",
      subtext: "Global Infrastructure Running",
      gradientFrom: "from-blue-500",
      gradientTo: "to-indigo-600",
      borderColor: "border-blue-300/40",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const current = features[activeFeature];

  return (
    <div className="w-full mb-8 px-4">
      <style>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(59, 130, 246, 0.1);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(59, 130, 246, 0), inset 0 0 20px rgba(59, 130, 246, 0.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0), inset 0 0 20px rgba(59, 130, 246, 0.1);
          }
        }
        @keyframes badge-slide {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
          }
        }
        .status-badge {
          animation: pulse-glow 2.5s ease-in-out infinite, badge-slide 5s ease-in-out infinite;
        }
        .status-badge-content {
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
      
      <div
        className={`relative p-4 rounded-xl shadow-2xl border ${current.borderColor} status-badge bg-gradient-to-r ${current.gradientFrom} ${current.gradientTo} status-badge-content`}
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
        
        <div className="relative flex items-start gap-3">
          <span className="text-2xl md:text-3xl animate-bounce">{current.icon}</span>
          <div className="flex-1">
            <p className="text-white font-bold text-sm md:text-base leading-tight">{current.text}</p>
            <p className="text-white/85 text-xs md:text-sm mt-1">{current.subtext}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPulseBadge;
