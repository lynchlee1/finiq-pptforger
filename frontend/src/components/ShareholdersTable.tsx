import React from "react";
import { Users, ArrowUp, ArrowDown } from "lucide-react";
import { Shareholder } from "../types";

interface Props {
  shareholders: Shareholder[];
  displayedShareholdersWithRatio: Shareholder[];
  maxShareholders: number;
  setMaxShareholders: (val: number) => void;
  toggleCallEnabled: (idx: number, val: boolean) => void;
  moveShareholder: (idx: number, dir: "up" | "down") => void;
}

export const ShareholdersTable: React.FC<Props> = ({
  shareholders,
  displayedShareholdersWithRatio,
  maxShareholders,
  setMaxShareholders,
  toggleCallEnabled,
  moveShareholder
}) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">주주 상세 (최대주주등)</h2>
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <Users className="w-4 h-4 text-slate-400" />
          <label className="text-[11px] font-bold text-slate-500 uppercase">표시 주주 수:</label>
          <input
            type="number"
            min={1}
            max={Math.max(1, shareholders.length)}
            value={maxShareholders}
            onChange={(e) => setMaxShareholders(parseInt(e.target.value) || 1)}
            className="w-12 text-center text-sm font-bold text-primary focus:outline-none"
          />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">주주명</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">관계</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">보통주</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">지분율 (%)</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Call 행사</th>
              <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center w-24">순서</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedShareholdersWithRatio.length > 0 ? (
              displayedShareholdersWithRatio.map((sh, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">{sh.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sh.relation}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">{sh.shares}</td>
                  <td className="px-6 py-4 text-sm text-slate-800 text-right font-bold">{sh.ratio}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={sh.callEnabled !== false}
                      onChange={(e) => toggleCallEnabled(idx, e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => moveShareholder(idx, "up")}
                        disabled={idx === 0 || sh.name === "기타특관자"}
                        className={`p-1 rounded-md transition-all ${idx === 0 || sh.name === "기타특관자" ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-primary hover:bg-primary/10"}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveShareholder(idx, "down")}
                        disabled={idx === displayedShareholdersWithRatio.length - 1 || sh.name === "기타특관자"}
                        className={`p-1 rounded-md transition-all ${idx === displayedShareholdersWithRatio.length - 1 || sh.name === "기타특관자" ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-primary hover:bg-primary/10"}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No shareholder data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
