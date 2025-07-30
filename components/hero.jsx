"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

const HeroSection = () => {
  const imageRef = useRef(null);

  useEffect(() => {
    const imageElement = imageRef.current;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 100;

      if (scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="pt-40 pb-20 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">
          Your Finance<br />Our Smart Intelligence 
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track, analyze, and improve your spending intelligently — powered by real-time AI insights.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Link href="https://www.youtube.com/@shub621ydv/posts">
            <Button size="lg" variant="outline" className="px-8">
              Watch Demo
            </Button>
          </Link>
        </div>
        <div className="hero-image-wrapper mt-5 md:mt-0">
          <div ref={imageRef} className="hero-image">
            <Image
              src="/banner.png"
              width={1280}
              height={720}
              alt="Dashboard Preview"
              className="rounded-lg shadow-2xl border mx-auto"
              priority
            />
          </div>
        </div>
      </div>

     {/* Floating WhatsApp & Mail buttons */}
<div className="fixed bottom-6 right-6 flex flex-col items-end space-y-3 z-50">
  <a
    href="https://wa.me/919416763571"
    target="_blank"
    rel="noopener noreferrer"
    className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-xl backdrop-blur-md border border-white/20 transition-all duration-300 transform hover:scale-110 hover:shadow-green-400/40"
    title="Chat on WhatsApp"
  >
    <MessageCircle size={24} className="animate-pulse" />
  </a>
  <a
    href="mailto:shubham2006621@gmail.com"
    className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl backdrop-blur-md border border-white/20 transition-all duration-300 transform hover:scale-110 hover:shadow-blue-400/40"
    title="Send Email"
  >
    <Mail size={24} className="animate-pulse" />
  </a>
</div>

    </section>
  );
};

export default HeroSection;
