import React from "react";
import { OwnershipCase } from "../types";

interface Props {
  isTreasuryEb: boolean;
  setIsTreasuryEb: (val: boolean) => void;
  mezzTypeEng: string;
  callPercent: string;
  setCallPercent: (val: string) => void;
  refixingPercent: string;
  setRefixingPercent: (val: string) => void;
  priorMezzanineShares: string;
  setPriorMezzanineShares: (val: string) => void;
  ownershipCases: OwnershipCase[];
  ownershipRowNames: string[];
}

export const OwnershipTable: React.FC<Props> = ({
  isTreasuryEb,
  setIsTreasuryEb,
  mezzTypeEng,
  callPercent,
  setCallPercent,
  refixingPercent,
  setRefixingPercent,
  priorMezzanineShares,
  setPriorMezzanineShares,
  ownershipCases,
  ownershipRowNames
}) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">지분율 계산</h2>
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
          <input
            type="checkbox"
            checked={isTreasuryEb}
            onChange={(e) => setIsTreasuryEb(e.target.checked)}
            disabled={mezzTypeEng !== "EB"}
            className="w-4 h-4 accent-primary"
          />
          자사주 EB
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Call (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={callPercent}
            onChange={(e) => setCallPercent(e.target.value)}
            placeholder="예: 70"
            className="w-full bg-transparent border-b border-slate-100 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg"
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">리픽싱 (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={refixingPercent}
            onChange={(e) => setRefixingPercent(e.target.value)}
            placeholder="예: 80"
            className="w-full bg-transparent border-b border-slate-100 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg"
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">기발행 메자닌 (주)</label>
          <input
            type="text"
            value={priorMezzanineShares}
            onChange={(e) => setPriorMezzanineShares(e.target.value)}
            placeholder="예: 4,865,301"
            className="w-full bg-transparent border-b border-slate-100 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">주주명</th>
              {ownershipCases.map((ownershipCase) => (
                <th key={ownershipCase.label} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  {ownershipCase.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ownershipRowNames.map((name) => (
              <tr key={name} className={name === "합계" ? "bg-slate-50" : ""}>
                <td className="px-4 py-3 text-sm font-bold text-slate-800">{name}</td>
                {ownershipCases.map((ownershipCase) => {
                  const row = ownershipCase.rows.find((item) => item.name === name);
                  const shares = name === "합계" ? ownershipCase.totalShares : row?.shares || 0;
                  const ratio = ownershipCase.denominatorShares > 0 ? (shares / ownershipCase.denominatorShares) * 100 : 0;
                  return (
                    <td key={`${ownershipCase.label}-${name}`} className="px-4 py-3 text-sm text-slate-700 text-right font-mono whitespace-nowrap">
                      <div className="font-semibold">{shares > 0 ? shares.toLocaleString() : "-"}</div>
                      <div className="text-[11px] text-slate-400">{shares > 0 || name === "합계" ? `${ratio.toFixed(1)}%` : "-"}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
