"use client";

import React, { useState, useEffect } from "react";

const AnimatedFinanceWord = () => {
  const [phase, setPhase] = useState("static");

  useEffect(() => {
    const timeline = [
      { phase: "static", duration: 2500 },
      { phase: "cracking", duration: 900 },
      { phase: "reformed", duration: 1800 },
      { phase: "reverse", duration: 900 },
    ];

    let currentPhaseIndex = 0;

    const cycle = () => {
      setPhase(timeline[currentPhaseIndex].phase);
      const timeout = setTimeout(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % timeline.length;
        cycle();
      }, timeline[currentPhaseIndex].duration);

      return timeout;
    };

    const timeout = cycle();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="inline-block relative">
      <style>{`
        @keyframes crack-burst {
          0% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            opacity: 1;
            transform: translate(0, 0);
          }
          25% {
            clip-path: polygon(0 0, 85% 0, 95% 25%, 100% 10%, 100% 100%, 0 100%);
            transform: translate(-2px, -1px);
          }
          50% {
            clip-path: polygon(10% 0, 90% 0, 100% 40%, 95% 60%, 85% 80%, 0 100%, 5% 50%);
            transform: translate(1px, 2px);
          }
          75% {
            clip-path: polygon(15% 5%, 80% 0, 100% 50%, 90% 85%, 40% 100%, 20% 80%, 0 40%);
            transform: translate(-1px, -2px);
          }
          100% {
            clip-path: polygon(50% 50%, 51% 50%, 51% 51%, 50% 51%);
            opacity: 0;
            transform: translate(0, 0);
          }
        }

        @keyframes word-morph-in {
          0% {
            opacity: 0;
            filter: blur(12px);
            transform: scale(0.7) rotateX(90deg);
          }
          50% {
            opacity: 0.6;
            filter: blur(6px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: scale(1) rotateX(0deg);
          }
        }

        @keyframes word-pulse {
          0% {
            text-shadow: 0 0 0px rgba(37, 99, 235, 0);
          }
          50% {
            text-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
          }
          100% {
            text-shadow: 0 0 0px rgba(37, 99, 235, 0);
          }
        }

        .word-container {
          position: relative;
          display: inline-block;
          perspective: 1000px;
        }

        .word-base {
          font-size: inherit;
          font-weight: inherit;
          color: inherit;
        }

        .word-overlay {
          position: absolute;
          left: 0;
          top: 0;
          font-size: inherit;
          font-weight: inherit;
        }

        /* Cracking phase */
        .phase-cracking .word-base {
          animation: crack-burst 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        .phase-cracking .word-overlay {
          animation: word-morph-in 0.9s ease-out forwards;
          color: #2563eb;
        }

        /* Reformed phase */
        .phase-reformed .word-overlay {
          animation: word-pulse 1.8s ease-in-out infinite;
          color: #2563eb;
        }

        /* Reverse phase */
        .phase-reverse .word-overlay {
          animation: crack-burst 0.9s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        .phase-reverse .word-base {
          animation: word-morph-in 0.9s ease-out forwards;
          color: #1e40af;
        }
      `}</style>

      <div className={`word-container phase-${phase}`}>
        {/* Base word */}
        {phase !== "reformed" ? (
          <span className="word-base">Finance</span>
        ) : (
          <span className="word-base">FintechNestAi</span>
        )}

        {/* Overlay word - shows during transitions */}
        {(phase === "cracking" || phase === "reformed" || phase === "reverse") && (
          <span className="word-overlay">
            {phase === "cracking" || phase === "reformed" ? "FintechNestAi" : "Finance"}
          </span>
        )}
      </div>
    </div>
  );
};

export default AnimatedFinanceWord;
