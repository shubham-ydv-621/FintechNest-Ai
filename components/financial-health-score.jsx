"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertCircle, CheckCircle, Award } from "lucide-react";
import { calculateFinancialHealth } from "@/actions/financial-health";

export function FinancialHealthScore({ accountId }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealthScore = async () => {
      try {
        setLoading(true);
        const response = await calculateFinancialHealth(accountId);
        if (response.success) {
          setHealthData(response.healthScore);
        }
      } catch (err) {
        console.error("Error fetching health score:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchHealthScore();
    }
  }, [accountId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !healthData) {
    return null; // Silently fail, don't break the dashboard
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "from-emerald-400 to-green-500";
    if (score >= 65) return "from-blue-400 to-blue-600";
    if (score >= 50) return "from-amber-400 to-orange-500";
    if (score >= 35) return "from-orange-400 to-red-500";
    return "from-red-400 to-red-600";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Excellent":
        return <Award className="w-5 h-5 text-emerald-500" />;
      case "Very Good":
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 border-0 text-white overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Financial Health Score</CardTitle>
          {getStatusIcon(healthData.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-blue-200">Overall Score</span>
            <span className={`text-4xl font-bold bg-gradient-to-r ${getScoreColor(healthData.totalScore)} bg-clip-text text-transparent`}>
              {healthData.totalScore}
            </span>
          </div>

          <div className="space-y-1">
            <Progress
              value={healthData.totalScore}
              className="h-3 bg-blue-950"
            />
            <p className="text-sm text-blue-300">
              Status: <span className="font-semibold text-white">{healthData.status}</span>
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3 pt-2 border-t border-blue-700/50">
          {Object.entries(healthData.breakdown).map(([key, component]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
                    {component.label}
                  </p>
                  <p className="text-xs text-blue-400 mt-0.5">
                    {component.value}{key === "emergencyFund" ? " months" : key === "incomeRatio" ? "x" : "%"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">
                    {component.score}/{component.weight}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: component.weight }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < component.score ? "bg-gradient-to-r from-blue-400 to-purple-500" : "bg-blue-950"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-700/50">
          <div className="bg-blue-800/30 rounded-lg p-3">
            <p className="text-xs text-blue-300">Monthly Savings</p>
            <p className="text-lg font-bold text-emerald-400">
              ₹{healthData.metrics.currentSavings.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-purple-800/30 rounded-lg p-3">
            <p className="text-xs text-purple-300">Emergency Fund</p>
            <p className="text-lg font-bold text-blue-400">
              {healthData.metrics.emergencyFundMonths} mo
            </p>
          </div>
        </div>

        {/* Recommendations Preview */}
        {healthData.recommendations && healthData.recommendations.length > 0 && (
          <div className="pt-2 border-t border-blue-700/50 space-y-2">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">
              Top Recommendations
            </p>
            {healthData.recommendations.slice(0, 2).map((rec, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded-lg ${
                  rec.priority === "high"
                    ? "bg-red-900/30 text-red-200"
                    : "bg-yellow-900/30 text-yellow-200"
                }`}
              >
                <p className="font-semibold">{rec.title}</p>
                <p className="text-xs mt-1">{rec.action}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
