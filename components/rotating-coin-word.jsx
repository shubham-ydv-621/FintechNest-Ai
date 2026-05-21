"use client";

import React from "react";
import { DollarSign } from "lucide-react";

const RotatingCoinWord = () => {
  return (
    <div className="inline-block relative">
      <style>{`
        @keyframes coin-flip {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(180deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }

        @keyframes coin-shine {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
        }

        .flip-container {
          display: inline-block;
          position: relative;
          width: 1em;
          height: 1.2em;
          margin: 0;
          vertical-align: text-bottom;
          perspective: 1000px;
        }

        .flipper {
          width: 100%;
          height: 100%;
          position: relative;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          animation: coin-flip 3s linear infinite;
        }

        .front, .back {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          backface-visibility: hidden;
          font-size: 1em;
          font-weight: 700;
          line-height: 1;
        }

        .front {
          color: #1f2937;
          background: transparent;
          z-index: 2;
        }

        .back {
          transform: rotateY(180deg);
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4), inset -1px -1px 3px rgba(0, 0, 0, 0.2), inset 1px 1px 3px rgba(255, 255, 255, 0.3);
          z-index: 1;
        }

        .back::before {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .back svg {
          width: 60%;
          height: 60%;
          color: #78350f;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
          z-index: 1;
        }
      `}</style>

      <span className="flip-container">
        <span className="flipper">
          <span className="front">O</span>
          <span className="back">
            <DollarSign strokeWidth={3} />
          </span>
        </span>
      </span>
      <span>ur</span>
    </div>
  );
};

export default RotatingCoinWord;

