import React from "react";

interface Props {
  companyDataAPI: any;
}

export const SummarySection: React.FC<Props> = ({ companyDataAPI }) => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">회사 이름</label>
        <input type="text" value={companyDataAPI.companyName} onChange={(e) => companyDataAPI.setCompanyName(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">상장시장</label>
        <input type="text" value={companyDataAPI.stockMarket} onChange={(e) => companyDataAPI.setStockMarket(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">발행주식수</label>
        <div className="flex items-center gap-1 border-b border-transparent hover:border-slate-200 focus-within:border-primary transition-all">
          <input type="text" value={companyDataAPI.totalIssuedShares.toLocaleString()} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; companyDataAPI.setTotalIssuedShares(val); }} className="w-full bg-transparent focus:outline-none text-slate-800 font-bold text-lg" />
          <span className="text-slate-400 font-bold text-sm shrink-0">주</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">신주발행주식수</label>
        <div className="flex items-center gap-1 border-b border-transparent hover:border-slate-200 focus-within:border-primary transition-all">
          <input type="text" value={companyDataAPI.newIssuedShares?.toLocaleString() || ""} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; companyDataAPI.setNewIssuedShares(val); }} className="w-full bg-transparent focus:outline-none text-slate-800 font-bold text-lg" />
          <span className="text-slate-400 font-bold text-sm shrink-0">주</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">최근 시가총액</label>
        <div className="flex items-center gap-1 border-b border-transparent hover:border-slate-200 focus-within:border-primary transition-all">
          <input type="text" value={companyDataAPI.marketCap?.toLocaleString() || ""} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; companyDataAPI.setMarketCap(val); }} className="w-full bg-transparent focus:outline-none text-slate-800 font-bold text-lg" />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">행사가격 (기준가격)</label>
        <div className="flex items-center gap-1 border-b border-transparent hover:border-slate-200 focus-within:border-primary transition-all">
          <input type="text" value={companyDataAPI.exercisePrice?.toLocaleString() || ""} onChange={(e) => { const val = parseInt(e.target.value.replace(/,/g, "")) || 0; companyDataAPI.setExercisePrice(val); }} className="w-full bg-transparent focus:outline-none text-slate-800 font-bold text-lg" />
          <span className="text-slate-400 font-bold text-sm shrink-0">원</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">발행종류 (KOR)</label>
        <input type="text" value={companyDataAPI.mezzTypeKor} onChange={(e) => companyDataAPI.setMezzTypeKor(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">발행종류 (ENG)</label>
        <input type="text" value={companyDataAPI.mezzTypeEng} onChange={(e) => companyDataAPI.setMezzTypeEng(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">기준일 (Base Date)</label>
        <input type="text" value={companyDataAPI.baseDate} onChange={(e) => companyDataAPI.setBaseDate(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">보고서 날짜 (Report Date)</label>
        <input type="text" value={companyDataAPI.reportDate} onChange={(e) => companyDataAPI.setReportDate(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2 group/card hover:border-primary/30 transition-all">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">프리미엄 (Premium Text)</label>
        <input type="text" value={companyDataAPI.premiumText} onChange={(e) => companyDataAPI.setPremiumText(e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none text-slate-800 font-bold text-lg transition-all" />
      </div>
    </section>
  );
};
