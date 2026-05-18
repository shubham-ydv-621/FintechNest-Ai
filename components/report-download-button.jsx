"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ReportMonthSelector } from "@/components/report-month-selector";
import { generateMonthlyReport } from "@/actions/generate-report";
import { generatePDFReport } from "@/lib/pdf-generator";

export function ReportDownloadButton({ accounts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pieChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    // Capture chart references from DOM when needed
    const pieChart = document.querySelector("[data-chart-type='pie']");
    const barChart = document.querySelector("[data-chart-type='bar']");
    if (pieChart) pieChartRef.current = pieChart;
    if (barChart) barChartRef.current = barChart;
  }, []);

  const handleGenerateReport = async (year, month, accountId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate report data
      toast.loading("Generating your financial report...");

      const response = await generateMonthlyReport(year, month, accountId);

      if (!response.success) {
        throw new Error("Failed to generate report data");
      }

      const reportData = response.reportData;

      // Prepare chart data (optional - charts will be embedded if available)
      const chartsData = {
        pieChart: pieChartRef.current,
        barChart: barChartRef.current,
      };

      // Generate PDF
      const { pdf, fileName } = await generatePDFReport(reportData, chartsData);

      // Download PDF
      pdf.save(fileName);

      toast.success("Report downloaded successfully!");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating report:", error);
      const errorMessage = error.message || "Failed to generate report. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!accounts || accounts.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500">
        <button
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          className="w-full h-full p-5 text-left text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex flex-col items-start justify-between h-full">
            <div className="flex items-center gap-3 mb-3">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Download className="h-8 w-8 group-hover:scale-110 transition-transform" />
              )}
              <h3 className="font-semibold text-lg">Monthly Report</h3>
            </div>

            <p className="text-sm text-white/90">Download your PDF financial report with insights & AI suggestions</p>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm text-white bg-red-500/20 px-2 py-1 rounded">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </button>
      </Card>

      <ReportMonthSelector
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setError(null);
        }}
        onGenerate={handleGenerateReport}
        isLoading={isLoading}
        accounts={accounts}
      />
    </>
  );
}
