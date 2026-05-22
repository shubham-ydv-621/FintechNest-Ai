"use client";

import React, { useState, useEffect } from "react";

const TypewriterAnimation = () => {
  const words = ["Finance", "FintechNestAi"];
  const [displayText, setDisplayText] = useState("Finance");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const typingSpeed = isDeleting ? 60 : 80; // Slightly faster delete, slower type
    const pauseTime = 2000; // Pause at end before switching words

    const timer = setTimeout(() => {
      const currentWord = words[currentWordIndex];
      
      if (!isDeleting && displayText === currentWord) {
        // Word fully typed, pause then start deleting
        setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
        return;
      }

      if (isDeleting && displayText === "") {
        // All deleted, move to next word
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        setLoopNum((prev) => prev + 1);
        return;
      }

      if (isDeleting) {
        // Delete one character
        setDisplayText((prev) => prev.slice(0, -1));
      } else {
        // Type one character
        const targetWord = words[currentWordIndex];
        setDisplayText((prev) => targetWord.slice(0, prev.length + 1));
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayText, currentWordIndex, isDeleting, words]);

  return (
    <div className="inline-block relative">
      <style>{`
        @keyframes cursor-blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }

        .typewriter-cursor {
          display: inline-block;
          width: 3px;
          height: 1em;
          background: linear-gradient(135deg, #2563eb, #a855f7);
          margin-left: 4px;
          animation: cursor-blink 1s ease-in-out infinite;
          vertical-align: text-bottom;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.5);
        }

        .typewriter-text {
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(to right, #2563eb, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
          min-width: 180px;
        }
      `}</style>

      <span className="typewriter-text">{displayText}</span>
      <span className="typewriter-cursor" />
    </div>
  );
};

export default TypewriterAnimation;
