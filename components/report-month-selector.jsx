"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function ReportMonthSelector({ isOpen, onClose, onGenerate, isLoading, accounts }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAccount, setSelectedAccount] = useState(accounts?.[0]?.id || "");

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleGenerate = async () => {
    if (!selectedAccount) {
      alert("Please select an account");
      return;
    }
    await onGenerate(selectedYear, selectedMonth, selectedAccount);
  };

  const monthDisplay = format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Download Monthly Report</DialogTitle>
          <DialogDescription>Select the month and account for your financial report</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Account</label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Year</label>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-gradient-to-br from-orange-50 to-pink-50 p-4">
            <p className="text-sm text-gray-600">Report for:</p>
            <p className="text-lg font-semibold text-gray-900">{monthDisplay}</p>
            <p className="text-xs text-gray-500 mt-2">
              Account: {accounts?.find((a) => a.id === selectedAccount)?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !selectedAccount}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>📥 Generate Report</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
