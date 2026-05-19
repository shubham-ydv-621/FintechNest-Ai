// import jsPDF from "jspdf";
// import "jspdf-autotable";
// import html2canvas from "html2canvas";
// import { format } from "date-fns";

// /**
//  * Generate PDF report with charts and branding
//  */
// export async function generatePDFReport(reportData, chartsData) {
//   try {
//     const pdf = new jsPDF({
//       orientation: "portrait",
//       unit: "mm",
//       format: "a4",
//       compress: true,
//       precision: 3,
//     });

//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const pageHeight = pdf.internal.pageSize.getHeight();
//     const margin = 15;
//     const contentWidth = pageWidth - 2 * margin;

//     let yPosition = margin;

//     // PAGE 1 - COVER PAGE
//     addBrandingHeader(pdf, pageWidth, yPosition, true);
//     yPosition += 40;

//     // Title
//     pdf.setFontSize(28);
//     pdf.setTextColor(0, 0, 0);
//     pdf.text("Monthly Financial Report", pageWidth / 2, yPosition, { align: "center" });
//     yPosition += 15;

//     pdf.setFontSize(12);
//     pdf.setTextColor(100, 100, 100);
//     pdf.text(reportData.period.monthName + " " + reportData.period.year, pageWidth / 2, yPosition, { align: "center" });
//     yPosition += 30;

//     // Report details
//     pdf.setFontSize(11);
//     pdf.setTextColor(50, 50, 50);
//     const detailsText = [
//       "Generated: " + format(new Date(reportData.generatedAt), "dd MMM yyyy"),
//       "Account: " + reportData.accountName,
//       "Period: " + format(new Date(reportData.period.startDate), "dd MMM") + " - " + format(new Date(reportData.period.endDate), "dd MMM yyyy"),
//     ];

//     detailsText.forEach((text) => {
//       pdf.text(text, pageWidth / 2, yPosition, { align: "center" });
//       yPosition += 7;
//     });

//     yPosition += 20;

//     // Stamp box
//     drawStampBox(pdf, pageWidth - margin - 50, margin + 5, 45, 25);

//     // Add watermark
//     addDiagonalWatermark(pdf, "FintechNest AI");
//     addLogoWatermark(pdf, pageWidth, pageHeight);

//     // PAGE 2 - KEY METRICS
//     pdf.addPage();
//     yPosition = margin;

//     addBrandingHeader(pdf, pageWidth, yPosition, false);
//     yPosition += 12;

//     addPageTitle(pdf, "📊 KEY METRICS", margin, yPosition, contentWidth);
//     yPosition += 15;

//     // Metrics cards
//     const metricCards = [
//       {
//         icon: "💰",
//         label: "Income",
//         value: "₹" + reportData.metrics.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
//         color: [45, 212, 191],
//       },
//       {
//         icon: "💸",
//         label: "Expenses",
//         value: "₹" + reportData.metrics.totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
//         color: [255, 140, 66],
//       },
//       {
//         icon: "💎",
//         label: "Savings",
//         value: "₹" + reportData.metrics.netSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
//         color: [255, 200, 87],
//       },
//     ];

//     metricCards.forEach((card, index) => {
//       const xPos = margin + (index * (contentWidth + 5)) / 3;
//       drawMetricCard(pdf, xPos, yPosition, (contentWidth - 10) / 3, 25, card);
//     });

//     yPosition += 35;

//     // Summary stats
//     pdf.setFontSize(10);
//     pdf.setTextColor(50, 50, 50);

//     const statsY = yPosition;
//     pdf.text(`Savings Rate: ${reportData.metrics.savingsRate.toFixed(1)}%`, margin, statsY);
//     pdf.text(
//       `Budget Status: ${reportData.metrics.budgetStatus.toFixed(1)}%`,
//       margin + contentWidth / 2,
//       statsY
//     );

//     yPosition += 20;

//     // Category breakdown table
//     addPageTitle(pdf, "📈 CATEGORY BREAKDOWN", margin, yPosition, contentWidth);
//     yPosition += 12;

//     const categoryTableData = reportData.categoryBreakdown.slice(0, 5).map((cat) => [
//       cat.category,
//       "₹" + cat.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
//       cat.percentage.toFixed(1) + "%",
//     ]);

//     pdf.autoTable({
//       startY: yPosition,
//       head: [["Category", "Amount", "% of Total"]],
//       body: categoryTableData,
//       margin: { left: margin, right: margin },
//       columnStyles: {
//         0: { cellWidth: (contentWidth * 0.5) },
//         1: { cellWidth: (contentWidth * 0.25), halign: "right" },
//         2: { cellWidth: (contentWidth * 0.25), halign: "right" },
//       },
//       headStyles: {
//         fillColor: [0, 0, 0],
//         textColor: [255, 255, 255],
//         fontStyle: "bold",
//       },
//       bodyStyles: {
//         textColor: [50, 50, 50],
//       },
//       alternateRowStyles: {
//         fillColor: [245, 245, 245],
//       },
//     });

//     addDiagonalWatermark(pdf, "FintechNest AI");
//     addPageFooter(pdf, pageWidth, pageHeight, 2);

//     // PAGE 3 - CHARTS
//     if (chartsData.pieChart || chartsData.barChart) {
//       pdf.addPage();
//       yPosition = margin;

//       addBrandingHeader(pdf, pageWidth, yPosition, false);
//       yPosition += 12;

//       addPageTitle(pdf, "📊 VISUALIZATIONS", margin, yPosition, contentWidth);
//       yPosition += 15;

//       // Pie chart
//       if (chartsData.pieChart) {
//         try {
//           const pieCanvas = await html2canvas(chartsData.pieChart, {
//             scale: 2,
//             useCORS: true,
//             allowTaint: true,
//           });
//           const pieImage = pieCanvas.toDataURL("image/png");
//           pdf.addImage(pieImage, "PNG", margin, yPosition, contentWidth, 60);
//           yPosition += 65;
//         } catch (e) {
//           console.log("Could not add pie chart:", e);
//         }
//       }

//       // Bar chart
//       if (chartsData.barChart) {
//         try {
//           const barCanvas = await html2canvas(chartsData.barChart, {
//             scale: 2,
//             useCORS: true,
//             allowTaint: true,
//           });
//           const barImage = barCanvas.toDataURL("image/png");
//           pdf.addImage(barImage, "PNG", margin, yPosition, contentWidth, 60);
//         } catch (e) {
//           console.log("Could not add bar chart:", e);
//         }
//       }

//       addDiagonalWatermark(pdf, "FintechNest AI");
//       addPageFooter(pdf, pageWidth, pageHeight, 3);
//     }

//     // PAGE 4 - TRANSACTIONS
//     pdf.addPage();
//     yPosition = margin;

//     addBrandingHeader(pdf, pageWidth, yPosition, false);
//     yPosition += 12;

//     addPageTitle(pdf, "💳 ALL TRANSACTIONS", margin, yPosition, contentWidth);
//     yPosition += 12;

//     const transactionTableData = reportData.transactions.slice(0, 20).map((t) => [
//       format(new Date(t.date), "dd MMM"),
//       t.description || "N/A",
//       "₹" + (t.amount?.toLocaleString ? t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : t.amount),
//       t.category,
//     ]);

//     pdf.autoTable({
//       startY: yPosition,
//       head: [["Date", "Description", "Amount", "Category"]],
//       body: transactionTableData,
//       margin: { left: margin, right: margin },
//       columnStyles: {
//         0: { cellWidth: (contentWidth * 0.15) },
//         1: { cellWidth: (contentWidth * 0.35) },
//         2: { cellWidth: (contentWidth * 0.25), halign: "right" },
//         3: { cellWidth: (contentWidth * 0.25) },
//       },
//       headStyles: {
//         fillColor: [0, 0, 0],
//         textColor: [255, 255, 255],
//         fontStyle: "bold",
//       },
//       bodyStyles: {
//         textColor: [50, 50, 50],
//         fontSize: 9,
//       },
//       alternateRowStyles: {
//         fillColor: [245, 245, 245],
//       },
//     });

//     addDiagonalWatermark(pdf, "FintechNest AI");
//     addPageFooter(pdf, pageWidth, pageHeight, 4);

//     // PAGE 5 - AI SUGGESTIONS
//     if (reportData.aiSuggestions && reportData.aiSuggestions.length > 0) {
//       pdf.addPage();
//       yPosition = margin;

//       addBrandingHeader(pdf, pageWidth, yPosition, false);
//       yPosition += 12;

//       addPageTitle(pdf, "🤖 AI-POWERED INSIGHTS", margin, yPosition, contentWidth);
//       yPosition += 15;

//       reportData.aiSuggestions.forEach((suggestion, index) => {
//         if (yPosition > pageHeight - 50) {
//           pdf.addPage();
//           yPosition = margin;
//           addBrandingHeader(pdf, pageWidth, yPosition, false);
//           yPosition += 12;
//         }

//         // Suggestion title
//         pdf.setFontSize(12);
//         pdf.setTextColor(0, 0, 0);
//         pdf.setFont(undefined, "bold");
//         pdf.text(`${index + 1}. ${suggestion.title || "Recommendation"}`, margin, yPosition);
//         yPosition += 8;

//         pdf.setFont(undefined, "normal");
//         pdf.setFontSize(10);
//         pdf.setTextColor(80, 80, 80);

//         // Category info
//         if (suggestion.category) {
//           pdf.text(`Category: ${suggestion.category}`, margin + 5, yPosition);
//           yPosition += 6;
//         }

//         if (suggestion.currentSpending) {
//           pdf.text(
//             `Current Spending: ₹${suggestion.currentSpending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
//             margin + 5,
//             yPosition
//           );
//           yPosition += 6;
//         }

//         // Actions
//         if (suggestion.actions && suggestion.actions.length > 0) {
//           pdf.text("Action Items:", margin + 5, yPosition);
//           yPosition += 5;

//           suggestion.actions.forEach((action) => {
//             pdf.text(`• ${action}`, margin + 10, yPosition);
//             yPosition += 5;
//           });
//         }

//         // Savings
//         if (suggestion.potentialSavings) {
//           pdf.setTextColor(76, 175, 80);
//           pdf.setFont(undefined, "bold");
//           pdf.text(
//             `Potential Savings: ₹${suggestion.potentialSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`,
//             margin + 5,
//             yPosition
//           );
//           pdf.setFont(undefined, "normal");
//           pdf.setTextColor(80, 80, 80);
//           yPosition += 8;
//         }

//         // Difficulty and timeframe
//         if (suggestion.difficulty || suggestion.timeframe) {
//           const difficulty = suggestion.difficulty || "N/A";
//           const timeframe = suggestion.timeframe || "N/A";
//           pdf.text(`Difficulty: ${difficulty} | Timeframe: ${timeframe}`, margin + 5, yPosition);
//           yPosition += 8;
//         }

//         yPosition += 3;
//       });

//       // Total potential savings
//       if (reportData.aiSuggestions.length > 0) {
//         const totalSavings = reportData.aiSuggestions.reduce(
//           (sum, s) => sum + (s.potentialSavings || 0),
//           0
//         );

//         yPosition += 5;
//         pdf.setFontSize(11);
//         pdf.setTextColor(0, 0, 0);
//         pdf.setFont(undefined, "bold");
//         pdf.text(
//           `Total Monthly Potential: ₹${totalSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
//           margin,
//           yPosition
//         );

//         pdf.setFont(undefined, "normal");
//         pdf.setFontSize(10);
//         pdf.setTextColor(80, 80, 80);
//         yPosition += 7;
//         pdf.text(
//           `Annual Potential: ₹${(totalSavings * 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
//           margin,
//           yPosition
//         );
//       }

//       addDiagonalWatermark(pdf, "FintechNest AI");
//       addPageFooter(pdf, pageWidth, pageHeight, 5);
//     }

//     // Generate filename
//     const fileName = `fintechnestai_${reportData.period.monthName}_${reportData.period.year}_report.pdf`;

//     return {
//       pdf,
//       fileName,
//     };
//   } catch (error) {
//     console.error("Error generating PDF:", error);
//     throw error;
//   }
// }

// /**
//  * Add branding header to page
//  */
// function addBrandingHeader(pdf, pageWidth, yPos, isCoverPage) {
//   const margin = 15;
//   const lineY = isCoverPage ? yPos + 35 : yPos + 8;

//   if (!isCoverPage) {
//     // Add logo and title on non-cover pages
//     pdf.setFontSize(10);
//     pdf.setTextColor(0, 0, 0);
//     pdf.setFont(undefined, "bold");
//     pdf.text("FintechNest AI", margin, yPos + 3);

//     pdf.setFontSize(8);
//     pdf.setTextColor(120, 120, 120);
//     pdf.setFont(undefined, "normal");
//     pdf.text("Your Finance Our Smart Intelligence", margin, yPos + 7);
//   }

//   // Divider line
//   pdf.setDrawColor(200, 200, 200);
//   pdf.line(margin, lineY, pageWidth - margin, lineY);
// }

// /**
//  * Add page title with icon
//  */
// function addPageTitle(pdf, title, x, y, width) {
//   pdf.setFontSize(14);
//   pdf.setTextColor(0, 0, 0);
//   pdf.setFont(undefined, "bold");
//   pdf.text(title, x, y);
// }

// /**
//  * Draw metric card
//  */
// function drawMetricCard(pdf, x, y, width, height, data) {
//   // Background
//   pdf.setFillColor(...data.color);
//   pdf.rect(x, y, width, height, "F");

//   // Icon
//   pdf.setFontSize(16);
//   pdf.setTextColor(255, 255, 255);
//   pdf.text(data.icon, x + 5, y + 10);

//   // Label
//   pdf.setFontSize(9);
//   pdf.text(data.label, x + 5, y + 16);

//   // Value
//   pdf.setFontSize(12);
//   pdf.setFont(undefined, "bold");
//   pdf.text(data.value, x + width - 5, y + 12, { align: "right" });
// }

// /**
//  * Draw stamp box
//  */
// function drawStampBox(pdf, x, y, width, height) {
//   pdf.setDrawColor(0, 0, 0);
//   pdf.setLineWidth(1);
//   pdf.rect(x, y, width, height);

//   pdf.setFontSize(7);
//   pdf.setTextColor(0, 0, 0);
//   pdf.setFont(undefined, "bold");
//   pdf.text("FintechNest AI", x + width / 2, y + 6, { align: "center" });

//   pdf.setFontSize(6);
//   pdf.setFont(undefined, "normal");
//   pdf.text("Personal Finance Platform", x + width / 2, y + 10, { align: "center" });

//   pdf.setFont(undefined, "bold");
//   pdf.text("✓ VERIFIED", x + width / 2, y + 15, { align: "center" });
// }

// /**
//  * Add diagonal watermark
//  */
// function addDiagonalWatermark(pdf, text) {
//   const pageWidth = pdf.internal.pageSize.getWidth();
//   const pageHeight = pdf.internal.pageSize.getHeight();

//   pdf.setFont(undefined, "bold");
//   pdf.setFontSize(60);
//   pdf.setTextColor(200, 200, 200);
//   pdf.setGState(new pdf.GState({ opacity: 0.15 }));

//   pdf.text(text, pageWidth / 2, pageHeight / 2, {
//     align: "center",
//     angle: -45,
//   });

//   pdf.setGState(new pdf.GState({ opacity: 1 }));
// }

// /**
//  * Add logo watermark (subtle background)
//  */
// function addLogoWatermark(pdf, pageWidth, pageHeight) {
//   try {
//     pdf.setGState(new pdf.GState({ opacity: 0.08 }));
//     pdf.setFontSize(100);
//     pdf.setTextColor(0, 0, 0);
//     pdf.text("FintechNest", pageWidth / 2, pageHeight / 2, {
//       align: "center",
//       angle: 0,
//     });
//     pdf.setGState(new pdf.GState({ opacity: 1 }));
//   } catch (e) {
//     // Silently fail for watermark
//   }
// }

// /**
//  * Add page footer
//  */
// function addPageFooter(pdf, pageWidth, pageHeight, pageNumber) {
//   const margin = 15;
//   const footerY = pageHeight - 10;

//   pdf.setFontSize(9);
//   pdf.setTextColor(150, 150, 150);

//   pdf.text("FintechNest AI | Monthly Financial Report", pageWidth / 2, footerY, { align: "center" });
//   pdf.text(`Page ${pageNumber}`, pageWidth - margin, footerY, { align: "right" });
//   pdf.text(format(new Date(), "dd MMM yyyy HH:mm"), margin, footerY);
// }



import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import { format } from "date-fns";

/**
 * Enhanced PDF Report Generator - Professional Corporate Style
 * Removes excessive logos, improves hierarchy, uses modern spacing
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
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    let yPosition = margin;

    // ============ PAGE 1 - PROFESSIONAL COVER PAGE ============
    addHeaderBar(pdf, pageWidth, 0);
    
    yPosition = 35;

    // Main title
    pdf.setFontSize(32);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(25, 35, 50);
    pdf.text("Financial Report", margin, yPosition);
    yPosition += 12;

    // Subtitle with period
    pdf.setFontSize(14);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(100, 110, 130);
    pdf.text(
      `${reportData.period.monthName} ${reportData.period.year}`,
      margin,
      yPosition
    );
    yPosition += 25;

    // Account info section
    pdf.setFontSize(11);
    pdf.setTextColor(80, 90, 110);
    pdf.setFont(undefined, "normal");

    const coverDetails = [
      { label: "Account Name", value: reportData.accountName },
      { label: "Report Period", value: `${format(new Date(reportData.period.startDate), "dd MMM")} - ${format(new Date(reportData.period.endDate), "dd MMM yyyy")}` },
      { label: "Generated", value: format(new Date(reportData.generatedAt), "dd MMMM yyyy") },
    ];

    coverDetails.forEach((detail) => {
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(60, 70, 90);
      pdf.text(detail.label, margin, yPosition);
      
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(100, 110, 130);
      pdf.text(detail.value, margin + 50, yPosition);
      yPosition += 8;
    });

    yPosition += 30;

    // Key highlights section
    pdf.setFontSize(13);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(25, 35, 50);
    pdf.text("Key Highlights", margin, yPosition);
    yPosition += 3;

    // Divider line
    pdf.setDrawColor(220, 225, 235);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Highlight boxes - clean version
    const highlightData = [
      {
        label: "Income",
        value: "₹" + reportData.metrics.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [45, 120, 180],
      },
      {
        label: "Expenses",
        value: "₹" + reportData.metrics.totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [220, 80, 80],
      },
      {
        label: "Savings",
        value: "₹" + reportData.metrics.netSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
        color: [76, 175, 80],
      },
    ];

    const highlightBoxWidth = (contentWidth - 4) / 3;

    highlightData.forEach((data, index) => {
      const boxX = margin + index * (highlightBoxWidth + 2);
      drawCleanMetricBox(pdf, boxX, yPosition, highlightBoxWidth, 22, data);
    });

    yPosition += 32;

    // Two-column stats
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(80, 90, 110);

    const stat1 = `Savings Rate: ${reportData.metrics.savingsRate.toFixed(1)}%`;
    const stat2 = `Budget Status: ${reportData.metrics.budgetStatus.toFixed(1)}%`;

    pdf.text(stat1, margin, yPosition);
    pdf.text(stat2, pageWidth / 2, yPosition);

    yPosition += 12;

    // Footer note
    pdf.setFontSize(9);
    pdf.setTextColor(150, 160, 180);
    pdf.setFont(undefined, "italic");
    pdf.text(
      "Report powered by FintechNest AI • www.fintechnestai.app",
      pageWidth / 2,
      pageHeight - 12,
      { align: "center" }
    );

    // Add subtle watermark
    addSubtleWatermark(pdf, pageWidth, pageHeight);

    // ============ PAGE 2 - CATEGORY BREAKDOWN ============
    pdf.addPage();
    yPosition = margin;

    addHeaderBar(pdf, pageWidth, 0);
    yPosition = 25;

    addSectionTitle(pdf, "Expense Breakdown by Category", margin, yPosition);
    yPosition += 12;

    // Category breakdown table
    const categoryTableData = reportData.categoryBreakdown.map((cat) => [
      cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
      "₹" + cat.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
      cat.percentage.toFixed(1) + "%",
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [["Category", "Amount", "Percentage"]],
      body: categoryTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5, textColor: [40, 50, 70] },
        1: { cellWidth: contentWidth * 0.25, halign: "right", textColor: [40, 50, 70] },
        2: { cellWidth: contentWidth * 0.25, halign: "right", textColor: [40, 50, 70] },
      },
      headStyles: {
        fillColor: [45, 120, 180],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      bodyStyles: {
        textColor: [80, 90, 110],
        fontSize: 10,
        cellPadding: 4,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 253],
      },
      lineColor: [220, 225, 235],
      lineWidth: 0.3,
    });

    yPosition = pdf.lastAutoTable.finalY + 15;

    // Summary stats box
    pdf.setFontSize(10);
    pdf.setFont(undefined, "bold");
    pdf.setTextColor(25, 35, 50);
    pdf.text("Summary Statistics", margin, yPosition);
    yPosition += 8;

    const totalAmount = reportData.categoryBreakdown.reduce((sum, cat) => sum + cat.amount, 0);
    const statsText = [
      `Total Expenses: ₹${totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      `Categories: ${reportData.categoryBreakdown.length}`,
      `Largest Expense: ${reportData.categoryBreakdown[0].category} (${reportData.categoryBreakdown[0].percentage.toFixed(1)}%)`,
    ];

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(80, 90, 110);
    statsText.forEach((stat) => {
      pdf.text(stat, margin, yPosition);
      yPosition += 6;
    });

    addPageFooter(pdf, pageWidth, pageHeight, 2);
    addSubtleWatermark(pdf, pageWidth, pageHeight);

    // ============ PAGE 3 - VISUALIZATIONS ============
    if (chartsData.pieChart || chartsData.barChart) {
      pdf.addPage();
      yPosition = margin;

      addHeaderBar(pdf, pageWidth, 0);
      yPosition = 25;

      addSectionTitle(pdf, "Visual Analysis", margin, yPosition);
      yPosition += 12;

      // Pie chart
      if (chartsData.pieChart) {
        try {
          const pieCanvas = await html2canvas(chartsData.pieChart, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          const pieImage = pieCanvas.toDataURL("image/png");
          pdf.addImage(pieImage, "PNG", margin, yPosition, contentWidth / 2 - 2, 50);
          
          // Add label
          pdf.setFontSize(9);
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(80, 90, 110);
          pdf.text("Expense Distribution", margin + 5, yPosition + 52);
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
          const barXPos = chartsData.pieChart ? pageWidth / 2 + 2 : margin;
          pdf.addImage(barImage, "PNG", barXPos, yPosition, contentWidth / 2 - 2, 50);
          
          // Add label
          pdf.setFontSize(9);
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(80, 90, 110);
          pdf.text("Category Comparison", barXPos + 5, yPosition + 52);
        } catch (e) {
          console.log("Could not add bar chart:", e);
        }
      }

      yPosition += 60;

      addPageFooter(pdf, pageWidth, pageHeight, 3);
      addSubtleWatermark(pdf, pageWidth, pageHeight);
    }

    // ============ PAGE 4 - TRANSACTIONS ============
    pdf.addPage();
    yPosition = margin;

    addHeaderBar(pdf, pageWidth, 0);
    yPosition = 25;

    addSectionTitle(pdf, "Transaction History", margin, yPosition);
    yPosition += 12;

    const transactionTableData = reportData.transactions.slice(0, 25).map((t) => [
      format(new Date(t.date), "dd MMM yyyy"),
      t.description || "N/A",
      "₹" + (t.amount?.toLocaleString ? t.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : t.amount),
      t.category.charAt(0).toUpperCase() + t.category.slice(1),
    ]);

    pdf.autoTable({
      startY: yPosition,
      head: [["Date", "Description", "Amount", "Category"]],
      body: transactionTableData,
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.2, textColor: [40, 50, 70] },
        1: { cellWidth: contentWidth * 0.35, textColor: [40, 50, 70] },
        2: { cellWidth: contentWidth * 0.2, halign: "right", textColor: [40, 50, 70] },
        3: { cellWidth: contentWidth * 0.25, textColor: [40, 50, 70] },
      },
      headStyles: {
        fillColor: [45, 120, 180],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: {
        textColor: [80, 90, 110],
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 253],
      },
      lineColor: [220, 225, 235],
      lineWidth: 0.3,
    });

    addPageFooter(pdf, pageWidth, pageHeight, 4);
    addSubtleWatermark(pdf, pageWidth, pageHeight);

    // ============ PAGE 5 - AI INSIGHTS ============
    if (reportData.aiSuggestions && reportData.aiSuggestions.length > 0) {
      pdf.addPage();
      yPosition = margin;

      addHeaderBar(pdf, pageWidth, 0);
      yPosition = 25;

      addSectionTitle(pdf, "AI-Powered Recommendations", margin, yPosition);
      yPosition += 15;

      reportData.aiSuggestions.forEach((suggestion, index) => {
        // Page break logic
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
          addHeaderBar(pdf, pageWidth, 0);
          yPosition = 25;
        }

        // Recommendation box background
        pdf.setFillColor(248, 250, 253);
        pdf.rect(margin, yPosition - 3, contentWidth, 2, "F");

        // Recommendation number and title
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(45, 120, 180);
        pdf.text(`${index + 1}. ${suggestion.title || "Recommendation"}`, margin + 3, yPosition + 2);
        yPosition += 8;

        // Category and spending
        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(100, 110, 130);

        if (suggestion.category) {
          pdf.text(`Category: ${suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}`, margin + 3, yPosition);
          yPosition += 5;
        }

        if (suggestion.currentSpending) {
          pdf.text(
            `Current Spending: ₹${suggestion.currentSpending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`,
            margin + 3,
            yPosition
          );
          yPosition += 5;
        }

        // Action items
        if (suggestion.actions && suggestion.actions.length > 0) {
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(80, 90, 110);
          pdf.text("Action Items:", margin + 3, yPosition);
          yPosition += 4;

          pdf.setFont(undefined, "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 110, 130);
          
          suggestion.actions.forEach((action) => {
            const wrappedText = pdf.splitTextToSize(action, contentWidth - 8);
            wrappedText.forEach((line, idx) => {
              const bullet = idx === 0 ? "• " : "  ";
              pdf.text(bullet + line, margin + 5, yPosition);
              yPosition += 3;
            });
          });
        }

        yPosition += 2;

        // Potential savings - highlighted
        if (suggestion.potentialSavings) {
          pdf.setFillColor(240, 250, 245);
          pdf.rect(margin + 2, yPosition - 2, contentWidth - 4, 6, "F");

          pdf.setFontSize(9);
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(76, 175, 80);
          pdf.text(
            `Potential Savings: ₹${suggestion.potentialSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/month`,
            margin + 5,
            yPosition + 2
          );
          yPosition += 8;
        }

        // Difficulty and timeframe
        if (suggestion.difficulty || suggestion.timeframe) {
          pdf.setFontSize(8);
          pdf.setFont(undefined, "normal");
          pdf.setTextColor(120, 130, 150);
          const difficulty = suggestion.difficulty || "N/A";
          const timeframe = suggestion.timeframe || "N/A";
          pdf.text(`Difficulty: ${difficulty} | Timeframe: ${timeframe}`, margin + 3, yPosition);
          yPosition += 6;
        }

        yPosition += 2;
      });

      // Total potential savings summary
      if (reportData.aiSuggestions.length > 0) {
        const totalSavings = reportData.aiSuggestions.reduce(
          (sum, s) => sum + (s.potentialSavings || 0),
          0
        );

        yPosition += 5;

        // Highlight box
        pdf.setFillColor(245, 248, 252);
        pdf.rect(margin, yPosition - 5, contentWidth, 18, "F");

        pdf.setLineWidth(1);
        pdf.setDrawColor(45, 120, 180);
        pdf.rect(margin, yPosition - 5, contentWidth, 18);

        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(25, 35, 50);
        pdf.text("Total Monthly Savings Potential", margin + 5, yPosition);

        pdf.setFontSize(13);
        pdf.setTextColor(76, 175, 80);
        pdf.text(
          `₹${totalSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          margin + 5,
          yPosition + 7
        );

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(100, 110, 130);
        pdf.text(
          `Annual Potential: ₹${(totalSavings * 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          margin + 5,
          yPosition + 12
        );
      }

      addPageFooter(pdf, pageWidth, pageHeight, 5);
      addSubtleWatermark(pdf, pageWidth, pageHeight);
    }

    // ============ PAGE 6 - FINANCIAL HEALTH SCORE ============
    if (reportData.healthScore) {
      pdf.addPage();
      yPosition = margin;

      addHeaderBar(pdf, pageWidth, 0);
      yPosition = 25;

      addSectionTitle(pdf, "Financial Health Score", margin, yPosition);
      yPosition += 15;

      const healthScore = reportData.healthScore;
      const scoreColor = 
        healthScore.totalScore >= 80 ? [76, 175, 80] :
        healthScore.totalScore >= 65 ? [45, 120, 180] :
        healthScore.totalScore >= 50 ? [255, 193, 7] :
        [255, 152, 0];

      // Main score box
      pdf.setFillColor(...scoreColor);
      pdf.rect(margin, yPosition, contentWidth, 30, "F");

      pdf.setFontSize(28);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text(healthScore.totalScore.toString(), margin + 10, yPosition + 15);

      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      pdf.text("/ 100", margin + 28, yPosition + 12);

      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text(healthScore.status, margin + contentWidth - 30, yPosition + 15, { align: "right" });

      yPosition += 35;

      // Breakdown scores
      const scoreRows = [
        ["Component", "Score", "Weight", "Status"],
        ...Object.entries(healthScore.breakdown).map(([key, component]) => {
          const percentage = (component.score / component.weight) * 100;
          const statusText = percentage >= 80 ? "Excellent" : percentage >= 60 ? "Good" : "Needs Work";
          return [
            component.label,
            `${component.score}/${component.weight}`,
            `${component.weight}%`,
            statusText,
          ];
        }),
      ];

      pdf.autoTable({
        startY: yPosition,
        head: [scoreRows[0]],
        body: scoreRows.slice(1),
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.3, textColor: [40, 50, 70] },
          1: { cellWidth: contentWidth * 0.2, halign: "center", textColor: [40, 50, 70] },
          2: { cellWidth: contentWidth * 0.2, halign: "center", textColor: [40, 50, 70] },
          3: { cellWidth: contentWidth * 0.3, halign: "right", textColor: [40, 50, 70] },
        },
        headStyles: {
          fillColor: [45, 120, 180],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        bodyStyles: {
          textColor: [80, 90, 110],
          fontSize: 9,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 253],
        },
      });

      yPosition = pdf.lastAutoTable.finalY + 10;

      // Key metrics
      pdf.setFontSize(11);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(25, 35, 50);
      pdf.text("Key Metrics", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(80, 90, 110);

      const metricsText = [
        `Monthly Savings: ₹${healthScore.metrics.currentSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
        `Emergency Fund: ${healthScore.metrics.emergencyFundMonths} months`,
        `Savings Rate: ${((healthScore.metrics.currentSavings / healthScore.metrics.currentIncome) * 100).toFixed(1)}%`,
      ];

      metricsText.forEach((text) => {
        pdf.text(text, margin, yPosition);
        yPosition += 6;
      });

      // Recommendations
      if (healthScore.recommendations && healthScore.recommendations.length > 0) {
        yPosition += 5;
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(25, 35, 50);
        pdf.text("Recommendations", margin, yPosition);
        yPosition += 8;

        healthScore.recommendations.slice(0, 3).forEach((rec) => {
          pdf.setFontSize(9);
          pdf.setFont(undefined, "bold");
          pdf.setTextColor(45, 120, 180);
          pdf.text(`• ${rec.title}`, margin, yPosition);
          yPosition += 5;

          pdf.setFont(undefined, "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 110, 130);
          pdf.text(rec.action, margin + 3, yPosition);
          yPosition += 5;
        });
      }

      addPageFooter(pdf, pageWidth, pageHeight, 6);
      addSubtleWatermark(pdf, pageWidth, pageHeight);
    }

    // ============ PAGE 7 - TAX DEDUCTION REPORT ============
    if (reportData.taxReport) {
      pdf.addPage();
      yPosition = margin;

      addHeaderBar(pdf, pageWidth, 0);
      yPosition = 25;

      addSectionTitle(pdf, "Tax Deduction Report", margin, yPosition);
      yPosition += 15;

      const taxReport = reportData.taxReport;

      // Year and summary
      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(80, 90, 110);
      pdf.text(`Financial Year: ${taxReport.year}`, margin, yPosition);
      yPosition += 8;

      // Summary boxes
      const summaryBoxes = [
        { label: "Total Income", value: `₹${taxReport.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
        { label: "Total Deductible", value: `₹${taxReport.totalDeductible.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
        { label: "Taxable Income", value: `₹${taxReport.incomeAfterDeduction.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
      ];

      const boxWidth = (contentWidth - 4) / 3;
      summaryBoxes.forEach((box, idx) => {
        const boxX = margin + idx * (boxWidth + 2);
        pdf.setFillColor(248, 250, 253);
        pdf.rect(boxX, yPosition, boxWidth, 18, "F");
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(220, 225, 235);
        pdf.rect(boxX, yPosition, boxWidth, 18);

        pdf.setFontSize(8);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(100, 110, 130);
        pdf.text(box.label, boxX + 3, yPosition + 5);

        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(45, 120, 180);
        pdf.text(box.value, boxX + 3, yPosition + 13);
      });

      yPosition += 25;

      // Deduction details
      if (Object.keys(taxReport.deductions).length > 0) {
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(25, 35, 50);
        pdf.text("Deductible Expenses", margin, yPosition);
        yPosition += 8;

        const deductionData = Object.entries(taxReport.deductions).map(([key, ded]) => [
          ded.name,
          `₹${ded.totalExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          `${ded.percentage}%`,
          `₹${ded.deductionAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
        ]);

        pdf.autoTable({
          startY: yPosition,
          head: [["Expense Category", "Total Amount", "Deductible %", "Deduction Amount"]],
          body: deductionData,
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.35, textColor: [40, 50, 70] },
            1: { cellWidth: contentWidth * 0.2, halign: "right", textColor: [40, 50, 70] },
            2: { cellWidth: contentWidth * 0.2, halign: "center", textColor: [40, 50, 70] },
            3: { cellWidth: contentWidth * 0.25, halign: "right", textColor: [40, 50, 70] },
          },
          headStyles: {
            fillColor: [45, 120, 180],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: {
            textColor: [80, 90, 110],
            fontSize: 9,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 253],
          },
        });

        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Tax savings
      pdf.setFillColor(240, 250, 245);
      pdf.rect(margin, yPosition, contentWidth, 18, "F");
      pdf.setLineWidth(1);
      pdf.setDrawColor(76, 175, 80);
      pdf.rect(margin, yPosition, contentWidth, 18);

      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.setTextColor(100, 110, 130);
      pdf.text("Estimated Tax Savings @ 30% Tax Bracket:", margin + 5, yPosition + 6);

      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.setTextColor(76, 175, 80);
      pdf.text(
        `₹${taxReport.estimatedTaxSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
        margin + 5,
        yPosition + 13
      );

      addPageFooter(pdf, pageWidth, pageHeight, 7);
      addSubtleWatermark(pdf, pageWidth, pageHeight);
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
 * Add clean header bar with company URL
 */
function addHeaderBar(pdf, pageWidth, yPos) {
  // Header background
  pdf.setFillColor(45, 120, 180);
  pdf.rect(0, yPos, pageWidth, 18, "F");

  // Company name
  pdf.setFontSize(12);
  pdf.setFont(undefined, "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.text("FintechNest AI", 15, yPos + 6);

  // Website URL
  pdf.setFontSize(8);
  pdf.setFont(undefined, "normal");
  pdf.setTextColor(220, 235, 250);
  pdf.text("www.fintechnestai.app", pageWidth - 15, yPos + 6, { align: "right" });

  // Tagline
  pdf.setFontSize(7);
  pdf.setTextColor(200, 225, 250);
  pdf.text("Personal Finance Platform", 15, yPos + 12);
}

/**
 * Add section title with underline
 */
function addSectionTitle(pdf, title, x, y) {
  pdf.setFontSize(14);
  pdf.setFont(undefined, "bold");
  pdf.setTextColor(25, 35, 50);
  pdf.text(title, x, y);

  // Underline
  pdf.setDrawColor(45, 120, 180);
  pdf.setLineWidth(1);
  pdf.line(x, y + 2, x + 60, y + 2);
}

/**
 * Draw clean metric box
 */
function drawCleanMetricBox(pdf, x, y, width, height, data) {
  // Box background
  pdf.setFillColor(...data.color);
  pdf.rect(x, y, width, height, "F");

  // Text
  pdf.setFontSize(9);
  pdf.setFont(undefined, "normal");
  pdf.setTextColor(255, 255, 255);
  pdf.text(data.label, x + 5, y + 6);

  pdf.setFontSize(11);
  pdf.setFont(undefined, "bold");
  pdf.text(data.value, x + 5, y + 14);
}

/**
 * Add subtle diagonal watermark
 */
function addSubtleWatermark(pdf, pageWidth, pageHeight) {
  pdf.setFont(undefined, "normal");
  pdf.setFontSize(70);
  pdf.setTextColor(230, 235, 245);
  pdf.setGState(new pdf.GState({ opacity: 0.08 }));

  pdf.text("FintechNest", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: -45,
  });

  pdf.setGState(new pdf.GState({ opacity: 1 }));
}

/**
 * Add page footer with website and page number
 */
function addPageFooter(pdf, pageWidth, pageHeight, pageNumber) {
  const margin = 20;
  const footerY = pageHeight - 8;

  pdf.setFontSize(8);
  pdf.setTextColor(150, 160, 180);
  pdf.setFont(undefined, "normal");

  // Center: Company info
  pdf.text(
    "www.fintechnestai.app | Personal Finance Platform",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Right: Page number
  pdf.text(`Page ${pageNumber}`, pageWidth - margin, footerY, { align: "right" });

  // Left: Date
  pdf.text(format(new Date(), "dd MMM yyyy"), margin, footerY);
}