"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Mail, MessageCircle as WhatsApp } from "lucide-react";
import Link from "next/link";

export function FloatingActionButtons() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const actions = [
    {
      id: "whatsapp",
      icon: WhatsApp,
      label: "WhatsApp",
      href: "https://wa.me/919876543210", // Replace with actual WhatsApp number
      bgColor: "bg-green-500 hover:bg-green-600",
      delay: "transition-all duration-300 ease-out",
    },
    {
      id: "mail",
      icon: Mail,
      label: "Email",
      href: "mailto:Shubham2006621@gmail.com",
      bgColor: "bg-red-500 hover:bg-red-600",
      delay: "transition-all duration-300 ease-out",
    },
    {
      id: "chat",
      icon: MessageCircle,
      label: "AI Chat",
      onClick: () => {
        // Trigger AI chat opening via custom event
        window.dispatchEvent(new CustomEvent("openAIChat"));
      },
      bgColor: "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
      delay: "transition-all duration-300 ease-out",
    },
  ];

  return (
    <>
      {/* Main Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 ${
          isOpen ? "scale-110" : "scale-100"
        } ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        } ${!isOpen ? "float" : ""}`}
        title="Contact & Support"
        aria-label="Open floating menu"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full ${
            isOpen ? "scale-0" : "scale-100"
          } transition-transform duration-300 opacity-20`}
          style={{
            animation: isOpen ? "none" : "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <MessageCircle className="w-6 h-6 relative z-10" />
      </button>

      {/* Background Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Floating Action Buttons Container - with proper z-stacking */}
      <div className="fixed bottom-6 right-6 z-40 pointer-events-none">
        {actions.map((action, index) => {
          const isVisible = isOpen;
          // Adjusted angles for better spacing - top, upper-left, lower-left
          const angles = [-90, 150, -150]; // Pointing up first, then spreading
          const angle = angles[index];
          const radius = 120; // Increased radius for better spacing
          const x = radius * Math.cos((angle * Math.PI) / 180);
          const y = radius * Math.sin((angle * Math.PI) / 180);

          const Component = action.icon;
          const ButtonContent = (
            <>
              <div
                className={`absolute inset-0 ${action.bgColor} rounded-full animate-pulse opacity-20 ${
                  isVisible ? "scale-150" : "scale-0"
                } transition-transform duration-300`}
                style={{
                  animation: isVisible
                    ? "none"
                    : "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <Component className="w-5 h-5 relative z-10" />
            </>
          );

          return (
            <div
              key={action.id}
              className={`absolute bottom-0 right-0 pointer-events-auto transition-all duration-500 ease-out ${
                isVisible
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-0 pointer-events-none"
              }`}
              style={{
                transform: isVisible
                  ? `translate(${x}px, ${-y}px) rotate(0deg)`
                  : "translate(0px, 0px) rotate(-180deg)",
                transitionDelay: isVisible ? `${index * 50}ms` : "0ms",
              }}
            >
              {action.onClick ? (
                <button
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-center w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl ${action.bgColor} transition-all duration-300 transform hover:scale-110 active:scale-95 relative overflow-hidden group`}
                  title={action.label}
                  aria-label={action.label}
                >
                  <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full" />
                  {ButtonContent}
                </button>
              ) : (
                <Link
                  href={action.href}
                  target={action.id === "mail" || action.id === "whatsapp" ? "_blank" : undefined}
                  rel={action.id === "mail" || action.id === "whatsapp" ? "noopener noreferrer" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-center w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl ${action.bgColor} transition-all duration-300 transform hover:scale-110 active:scale-95 block relative overflow-hidden group`}
                  title={action.label}
                  aria-label={action.label}
                >
                  <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full" />
                  {ButtonContent}
                </Link>
              )}

              {/* Label */}
              <div
                className={`absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap transition-opacity duration-300 pointer-events-none ${
                  isVisible ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 50 + 100}ms` : "0ms",
                }}
              >
                {action.label}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </>
  );
}
