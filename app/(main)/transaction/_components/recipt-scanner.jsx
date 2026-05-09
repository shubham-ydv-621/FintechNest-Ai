"use client";

import { useRef, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { scanReceipt } from "@/actions/transaction";

async function normalizeImageFile(file) {
  if (!file) throw new Error("No file provided");
  
  console.log(`[Image] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, ${file.type})`);

  // If already JPEG and reasonably small, use as-is
  if (file.type === "image/jpeg" && file.size < 2 * 1024 * 1024) {
    console.log("[Image] Using as-is (small JPEG)");
    return file;
  }

  // Otherwise, always compress
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      console.error("[Image] FileReader error");
      reject(new Error("Unable to read file"));
    };
    
    reader.onload = (event) => {
      console.log("[Image] File read, creating Image object");
      const img = new Image();
      img.onerror = () => {
        console.error("[Image] Image load error");
        reject(new Error("Unable to load image"));
      };
      
      img.onload = () => {
        try {
          console.log(`[Image] Loaded: ${img.width}x${img.height}px`);
          let width = img.width;
          let height = img.height;
          const maxDimension = 1400;

          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          console.log(`[Image] Resizing to: ${width}x${height}px`);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context unavailable");
          
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              try {
                if (!blob) throw new Error("Blob creation failed");
                const sizeReduction = ((1 - blob.size / file.size) * 100).toFixed(1);
                console.log(`[Image] Compressed: ${(blob.size / 1024 / 1024).toFixed(2)}MB (${sizeReduction}% smaller)`);
                
                const fileName = file.name.replace(/\.[^/.]+$/, ".jpg");
                const compressedFile = new File([blob], fileName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } catch (err) {
                console.error(`[Image] Blob error: ${err.message}`);
                reject(err);
              }
            },
            "image/jpeg",
            0.75
          );
        } catch (err) {
          console.error(`[Image] Canvas error: ${err.message}`);
          reject(new Error("Canvas compression failed: " + err.message));
        }
      };
      
      img.src = event.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

export function ReceiptScanner({ onScanComplete }) {
  const fileInputRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState("");

  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scannedData,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if (!file) return;
    setErrorMessage("");
    console.log("[Scanner] Scan initiated");

    try {
      // Always compress to ensure file fits
      console.log("[Scanner] Starting image normalization");
      const processedFile = await normalizeImageFile(file);
      console.log("[Scanner] Image normalized, calling API");
      await scanReceiptFn(processedFile);
      console.log("[Scanner] API call completed");
    } catch (error) {
      const message = error?.message || "Failed to process image";
      console.error("[Scanner] Error:", message);
      setErrorMessage(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    if (scannedData && !scanReceiptLoading) {
      onScanComplete(scannedData);
      toast.success("Receipt scanned successfully");
    }
  }, [scanReceiptLoading, scannedData]);

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hover:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
      {errorMessage ? (
        <div className="text-sm text-red-600 mt-2">{errorMessage}</div>
      ) : null}
    </div>
  );
}