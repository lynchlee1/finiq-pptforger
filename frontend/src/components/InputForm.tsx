import React from "react";
import { Search, Sparkles, FileText, Settings } from "lucide-react";

interface InputFormProps {
  inputs: any;
  handleInputChange: (key: string, value: string) => void;
  handleStartParsing: () => void;
  error: string | null;
  setIsPromptOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
  aiOptions: { investment: boolean; price: boolean; risk: boolean };
  setAiOptions: React.Dispatch<React.SetStateAction<{ investment: boolean; price: boolean; risk: boolean }>>;
}

const inputFields = [
  { key: "stock_code", label: "종목코드", placeholder: "종목코드를 입력하세요. (예: 005930)", required: true },
  { key: "mezz_type_full", label: "발행종류", placeholder: "발행종류를 입력하세요. (예: 무기명식 무보증 사모 전환사채)", required: true },
  { key: "issue_amt", label: "발행규모", placeholder: "발행규모를 입력하세요. (예: 1,000억원)", required: true },
  { key: "investment_amt", label: "투자규모", placeholder: "투자규모를 입력하세요. (예: 100억원)", required: true },
];

export const InputForm: React.FC<InputFormProps> = ({
  inputs, handleInputChange, handleStartParsing, error, setIsPromptOpen, setIsSettingsOpen, aiOptions, setAiOptions
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50/50 overflow-y-auto relative">
      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={() => setIsPromptOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm group" title="Prompt Settings">
          <FileText className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm group" title="API Settings">
          <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8 my-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 bg-primary/10 rounded-2xl items-center justify-center text-primary mb-2">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Deal Data Parser</h1>
          <p className="text-slate-500 text-sm">Enter the details to fetch and process deal information.</p>
        </div>

        <div className="space-y-6">
          {inputFields.map((field) => (
            <div key={field.key} className="space-y-2 group/field">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                {field.label}
                {field.required && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Required</span>}
              </label>
              <input
                type="text"
                value={(inputs as any)[field.key]}
                onChange={(e) => {
                  let val = e.target.value;
                  if (field.key === "stock_code") val = val.replace(/[^0-9]/g, "").substring(0, 6);
                  handleInputChange(field.key, val);
                }}
                placeholder={field.placeholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all shadow-sm shadow-slate-100/50"
              />
            </div>
          ))}

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI 자동 생성 항목 선택</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={aiOptions.investment} onChange={(e) => setAiOptions(p => ({...p, investment: e.target.checked}))} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
                <span className="text-sm text-slate-700 font-bold group-hover:text-primary transition-colors">투자 포인트</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={aiOptions.price} onChange={(e) => setAiOptions(p => ({...p, price: e.target.checked}))} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
                <span className="text-sm text-slate-700 font-bold group-hover:text-primary transition-colors">주가 추이</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={aiOptions.risk} onChange={(e) => setAiOptions(p => ({...p, risk: e.target.checked}))} className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary" />
                <span className="text-sm text-slate-700 font-bold group-hover:text-primary transition-colors">상환가능성 분석</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><span className="font-bold text-[10px]">!</span></div>
              {error}
            </div>
          )}

          <button onClick={handleStartParsing} className="w-full py-4 bg-primary hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-base font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/25">
            Start Parsing
            <Sparkles className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
