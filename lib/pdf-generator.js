import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";

/**
 * Generate PDF report with charts and branding
 */
export async function generatePDFReport(reportData, chartsData) {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
      precision: 3,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    let yPosition = margin;

    // PAGE 1 - COVER PAGE
    addBrandingHeader(pdf, pageWidth, yPosition, true);
    yPosition += 40;

    // Title
    pdf.setFontSize(28);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Monthly Financial Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(reportData.period.monthName + " " + reportData.period.year, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 30;

    // Report details
    pdf.setFontSize(11);
    pdf.setTextColor(50, 50, 50);
    const detailsText = [
      "Generated: " + format(new Date(reportData.generatedAt), "dd MMM yyyy"),
      "Account: " + reportData.accountName,
      "Period: " + format(new Date(reportData.period.startDate), "dd MMM") + " - " + format(new Date(reportData.period.endDate), "dd MMM yyyy"),
    ];

    detailsText.forEach((text) => {
      pdf.text(text, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 7;
    });

    yPosition += 20;

    // Stamp box
    drawStampBox(pdf, pageWidth - margin - 50, margin + 5, 45, 25);

    // Add watermark
    addDiagonalWatermark(pdf, "FintechNest AI");
    addLogoWatermark(pdf, pageWidth, pageHeight);

    // PAGE 2 - KEY METRICS
    pdf.addPage();
    yPosition = margin;

    addBrandingHeader(pdf, pageWidth, yPosition, false);
    yPosition += 12;

    addPageTitle(pdf, "📊 KEY METRICS", margin, yPosition, contentWidth);
    yPosition += 15;

    // Metrics cards
    const metricCards = [
      {
        icon: "💰",
        label: "Income",
        value: "₹" + reportData.metrics.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [45, 212, 191],
      },
      {
        icon: "💸",
        label: "Expenses",
        value: "₹" + reportData.metrics.totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [255, 140, 66],
      },
      {
        icon: "💎",
        label: "Savings",
        value: "₹" + reportData.metrics.netSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [255, 200, 87],
      },
    ];

    metricCards.forEach((card, index) => {
      const xPos = margin + (index * (contentWidth + 5)) / 3;
      drawMetricCard(pdf, xPos, yPosition, (contentWidth - 10) / 3, 25, card);
    });

    yPosition += 35;

    // Summary stats
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);

    const statsY = yPosition;
    pdf.text(`Savings Rate: ${reportData.metrics.savingsRate.toFixed(1)}%`, margin, statsY);
    pdf.text(
      `Budget Status: ${reportData.metrics.budgetStatus.toFixed(1)}%`,
      margin + contentWidth / 2,
      statsY
    );

    yPosition += 20;

    // Category breakdown table
    addPageTitle(pdf, "📈 CATEGORY BREAKDOWN", margin, yPosition, contentWidth);
    yPosition += 12;

    const categoryTableData = reportData.categoryBreakdown.slice(0, 5).map((cat) => [
      cat.category,
      "₹" + cat.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
      cat.percentage.toFixed(1) + "%",
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [["Category", "Amount", "% of Total"]],
      body: categoryTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: (contentWidth * 0.5) },
        1: { cellWidth: (contentWidth * 0.25), halign: "right" },
        2: { cellWidth: (contentWidth * 0.25), halign: "right" },
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: [50, 50, 50],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    addDiagonalWatermark(pdf, "FintechNest AI");
    addPageFooter(pdf, pageWidth, pageHeight, 2);

    // PAGE 3 - CHARTS
    if (chartsData.pieChart || chartsData.barChart) {
      pdf.addPage();
      yPosition = margin;

      addBrandingHeader(pdf, pageWidth, yPosition, false);
      yPosition += 12;

      addPageTitle(pdf, "📊 VISUALIZATIONS", margin, yPosition, contentWidth);
      yPosition += 15;

      // Pie chart
      if (chartsData.pieChart) {
        try {
          const pieCanvas = await html2canvas(chartsData.pieChart, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          const pieImage = pieCanvas.toDataURL("image/png");
          pdf.addImage(pieImage, "PNG", margin, yPosition, contentWidth, 60);
          yPosition += 65;
        } catch (e) {
          console.log("Could not add pie chart:", e);
        }
      }

      // Bar chart
      if (chartsData.barChart) {
        try {
          const barCanvas = await html2canvas(chartsData.barChart, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          const barImage = barCanvas.toDataURL("image/png");
          pdf.addImage(barImage, "PNG", margin, yPosition, contentWidth, 60);
        } catch (e) {
          console.log("Could not add bar chart:", e);
        }
      }

      addDiagonalWatermark(pdf, "FintechNest AI");
      addPageFooter(pdf, pageWidth, pageHeight, 3);
    }

    // PAGE 4 - TRANSACTIONS
    pdf.addPage();
    yPosition = margin;

    addBrandingHeader(pdf, pageWidth, yPosition, false);
    yPosition += 12;

    addPageTitle(pdf, "💳 ALL TRANSACTIONS", margin, yPosition, contentWidth);
    yPosition += 12;

    const transactionTableData = reportData.transactions.slice(0, 20).map((t) => [
      format(new Date(t.date), "dd MMM"),
      t.description || "N/A",
      "₹" + (t.amount?.toLocaleString ? t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : t.amount),
      t.category,
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [["Date", "Description", "Amount", "Category"]],
      body: transactionTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: (contentWidth * 0.15) },
        1: { cellWidth: (contentWidth * 0.35) },
        2: { cellWidth: (contentWidth * 0.25), halign: "right" },
        3: { cellWidth: (contentWidth * 0.25) },
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: [50, 50, 50],
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    addDiagonalWatermark(pdf, "FintechNest AI");
    addPageFooter(pdf, pageWidth, pageHeight, 4);

    // PAGE 5 - AI SUGGESTIONS
    if (reportData.aiSuggestions && reportData.aiSuggestions.length > 0) {
      pdf.addPage();
      yPosition = margin;

      addBrandingHeader(pdf, pageWidth, yPosition, false);
      yPosition += 12;

      addPageTitle(pdf, "🤖 AI-POWERED INSIGHTS", margin, yPosition, contentWidth);
      yPosition += 15;

      reportData.aiSuggestions.forEach((suggestion, index) => {
        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = margin;
          addBrandingHeader(pdf, pageWidth, yPosition, false);
          yPosition += 12;
        }

        // Suggestion title
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, "bold");
        pdf.text(`${index + 1}. ${suggestion.title || "Recommendation"}`, margin, yPosition);
        yPosition += 8;

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);

        // Category info
        if (suggestion.category) {
          pdf.text(`Category: ${suggestion.category}`, margin + 5, yPosition);
          yPosition += 6;
        }

        if (suggestion.currentSpending) {
          pdf.text(
            `Current Spending: ₹${suggestion.currentSpending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
            margin + 5,
            yPosition
          );
          yPosition += 6;
        }

        // Actions
        if (suggestion.actions && suggestion.actions.length > 0) {
          pdf.text("Action Items:", margin + 5, yPosition);
          yPosition += 5;

          suggestion.actions.forEach((action) => {
            pdf.text(`• ${action}`, margin + 10, yPosition);
            yPosition += 5;
          });
        }

        // Savings
        if (suggestion.potentialSavings) {
          pdf.setTextColor(76, 175, 80);
          pdf.setFont(undefined, "bold");
          pdf.text(
            `Potential Savings: ₹${suggestion.potentialSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`,
            margin + 5,
            yPosition
          );
          pdf.setFont(undefined, "normal");
          pdf.setTextColor(80, 80, 80);
          yPosition += 8;
        }

        // Difficulty and timeframe
        if (suggestion.difficulty || suggestion.timeframe) {
          const difficulty = suggestion.difficulty || "N/A";
          const timeframe = suggestion.timeframe || "N/A";
          pdf.text(`Difficulty: ${difficulty} | Timeframe: ${timeframe}`, margin + 5, yPosition);
          yPosition += 8;
        }

        yPosition += 3;
      });

      // Total potential savings
      if (reportData.aiSuggestions.length > 0) {
        const totalSavings = reportData.aiSuggestions.reduce(
          (sum, s) => sum + (s.potentialSavings || 0),
          0
        );

        yPosition += 5;
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, "bold");
        pdf.text(
          `Total Monthly Potential: ₹${totalSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          margin,
          yPosition
        );

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        yPosition += 7;
        pdf.text(
          `Annual Potential: ₹${(totalSavings * 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          margin,
          yPosition
        );
      }

      addDiagonalWatermark(pdf, "FintechNest AI");
      addPageFooter(pdf, pageWidth, pageHeight, 5);
    }

    // Generate filename
    const fileName = `fintechnestai_${reportData.period.monthName}_${reportData.period.year}_report.pdf`;

    return {
      pdf,
      fileName,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

/**
 * Add branding header to page
 */
function addBrandingHeader(pdf, pageWidth, yPos, isCoverPage) {
  const margin = 15;
  const lineY = isCoverPage ? yPos + 35 : yPos + 8;

  if (!isCoverPage) {
    // Add logo and title on non-cover pages
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, "bold");
    pdf.text("FintechNest AI", margin, yPos + 3);

    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont(undefined, "normal");
    pdf.text("Your Finance Our Smart Intelligence", margin, yPos + 7);
  }

  // Divider line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, lineY, pageWidth - margin, lineY);
}

/**
 * Add page title with icon
 */
function addPageTitle(pdf, title, x, y, width) {
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, "bold");
  pdf.text(title, x, y);
}

/**
 * Draw metric card
 */
function drawMetricCard(pdf, x, y, width, height, data) {
  // Background
  pdf.setFillColor(...data.color);
  pdf.rect(x, y, width, height, "F");

  // Icon
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text(data.icon, x + 5, y + 10);

  // Label
  pdf.setFontSize(9);
  pdf.text(data.label, x + 5, y + 16);

  // Value
  pdf.setFontSize(12);
  pdf.setFont(undefined, "bold");
  pdf.text(data.value, x + width - 5, y + 12, { align: "right" });
}

/**
 * Draw stamp box
 */
function drawStampBox(pdf, x, y, width, height) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(1);
  pdf.rect(x, y, width, height);

  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, "bold");
  pdf.text("FintechNest AI", x + width / 2, y + 6, { align: "center" });

  pdf.setFontSize(6);
  pdf.setFont(undefined, "normal");
  pdf.text("Personal Finance Platform", x + width / 2, y + 10, { align: "center" });

  pdf.setFont(undefined, "bold");
  pdf.text("✓ VERIFIED", x + width / 2, y + 15, { align: "center" });
}

/**
 * Add diagonal watermark
 */
function addDiagonalWatermark(pdf, text) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setFont(undefined, "bold");
  pdf.setFontSize(60);
  pdf.setTextColor(200, 200, 200);
  pdf.setGState(new pdf.GState({ opacity: 0.15 }));

  pdf.text(text, pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: -45,
  });

  pdf.setGState(new pdf.GState({ opacity: 1 }));
}

/**
 * Add logo watermark (subtle background)
 */
function addLogoWatermark(pdf, pageWidth, pageHeight) {
  try {
    pdf.setGState(new pdf.GState({ opacity: 0.08 }));
    pdf.setFontSize(100);
    pdf.setTextColor(0, 0, 0);
    pdf.text("FintechNest", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 0,
    });
    pdf.setGState(new pdf.GState({ opacity: 1 }));
  } catch (e) {
    // Silently fail for watermark
  }
}

/**
 * Add page footer
 */
function addPageFooter(pdf, pageWidth, pageHeight, pageNumber) {
  const margin = 15;
  const footerY = pageHeight - 10;

  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);

  pdf.text("FintechNest AI | Monthly Financial Report", pageWidth / 2, footerY, { align: "center" });
  pdf.text(`Page ${pageNumber}`, pageWidth - margin, footerY, { align: "right" });
  pdf.text(format(new Date(), "dd MMM yyyy HH:mm"), margin, footerY);
}
