
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

import { Inter } from "next/font/google";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";


const inter = Inter({subsets: ["latin"]});

export const metadata = {
  title: "FintechNest-Ai",
  description: "Empowering smarter finance with AI",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className={`${inter.className} `}  >
         <Header/>
          <main className="min-h-screen">{children}</main>
          <Toaster richColors/>

        <footer className="bg-blue-50 py-8">
  <div className="container mx-auto px-4 text-center text-gray-600 space-y-2">
    <div className="flex justify-center space-x-4 text-xs text-gray-500">
      <span>© {new Date().getFullYear()} FintechNest-AI</span>
      <span>|</span>
      <a href="/privacy" className="hover:underline">Privacy Policy</a>
      <span>|</span>
      <a href="/terms" className="hover:underline">Terms of Service</a>
    </div>
    <p className="text-xs">
      For any queries, mail to  
      <a href="mailto:Shubham2006621@gmail.com" className="hover:underline ml-1">
        Shubham2006621@gmail.com
      </a>
    </p>
    <p className="text-xs text-gray-400">
      Designed and maintained by Shubham Yadav
    </p>
  </div>
</footer>
   <Analytics />
      </body> 
    </html>
    </ClerkProvider>
  );
}
