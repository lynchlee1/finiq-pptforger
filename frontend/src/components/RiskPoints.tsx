import React from "react";
import { RefreshCw } from "lucide-react";
import { getCompanyInfoString } from "../utils/constants";

interface Props {
  riskPoints: any[];
  setRiskPoints: (val: any[]) => void;
  isGenerating: boolean;
  hasApiKeys: boolean;
  companyName: string;
  stockCode: string;
  financialData?: any;
  handleGenerateRisk: (info: string, financialData?: any) => void;
}

export const RiskPoints: React.FC<Props> = ({
  riskPoints,
  setRiskPoints,
  isGenerating,
  hasApiKeys,
  companyName,
  stockCode,
  financialData,
  handleGenerateRisk
}) => {
  return (
    <section className="space-y-4 mt-8 border-t border-slate-100 pt-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Risk Analysis (AI Generated)
        </h2>
        <div className="flex items-center gap-4">
          {isGenerating && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Generating...</span>
            </div>
          )}
          <button
            onClick={() => {
              if (window.confirm("해당 기능은 API 사용량에 영향을 미칩니다. 계속하시겠습니까?")) {
                handleGenerateRisk(getCompanyInfoString(companyName, stockCode), financialData);
              }
            }}
            disabled={isGenerating || !hasApiKeys}
            className="text-[10px] font-bold text-primary hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 transition-colors disabled:text-slate-300"
          >
            <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {riskPoints.map((point, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 group/card hover:border-primary/30 transition-all">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Title {idx + 1}</label>
              <input
                type="text"
                value={point.title}
                onChange={(e) => {
                  const newPoints = [...riskPoints];
                  newPoints[idx].title = e.target.value;
                  setRiskPoints(newPoints);
                }}
                className="w-full bg-transparent border-b border-slate-100 focus:border-primary focus:outline-none text-slate-800 font-bold text-sm transition-all py-1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk Content {idx + 1}</label>
              <textarea
                value={point.contents1}
                onChange={(e) => {
                  const newPoints = [...riskPoints];
                  newPoints[idx].contents1 = e.target.value;
                  setRiskPoints(newPoints);
                }}
                className="w-full bg-slate-50 border border-transparent hover:border-slate-100 focus:border-primary/20 focus:bg-white focus:outline-none text-slate-600 text-xs transition-all p-2 rounded-lg resize-none h-16"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
