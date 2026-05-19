import React, { useState } from "react";
import { AppState } from "./types";
import { useCompanyData } from "./hooks/useCompanyData";
import { useGeminiAPI } from "./hooks/useGeminiAPI";
import { InputForm } from "./components/InputForm";
import { ResultView } from "./components/ResultView";
import { SettingsModals } from "./components/SettingsModals";
import { Sparkles } from "lucide-react";
import { getCompanyInfoString } from "./utils/constants";

const App: React.FC = () => {
  const [viewState, setViewState] = useState<AppState>("input");
  
  const [inputs, setInputs] = useState({
    stock_code: "",
    mezz_type_full: "",
    investment_amt: "",
    issue_amt: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const [aiOptions, setAiOptions] = useState({
    investment: true,
    price: true,
    risk: true,
  });

  const companyDataAPI = useCompanyData();
  const geminiAPI = useGeminiAPI();

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartParsing = async () => {
    if (!inputs.stock_code || inputs.stock_code.length !== 6) {
      alert("Please enter a valid 6-digit stock code.");
      return;
    }

    setViewState("loading");
    setError(null);
    geminiAPI.resetGeneratedContent();

    const result = await companyDataAPI.fetchCompanyData(
      inputs.stock_code,
      inputs.mezz_type_full,
      inputs.investment_amt
    );

    if (result.success) {
      const infoString = getCompanyInfoString(companyDataAPI.companyName, inputs.stock_code);
      if (aiOptions.investment) geminiAPI.handleGenerateInvestmentPoints(infoString);
      if (aiOptions.price && geminiAPI.handleGeneratePrice) geminiAPI.handleGeneratePrice(infoString);
      if (aiOptions.risk && geminiAPI.handleGenerateRisk) geminiAPI.handleGenerateRisk(infoString, result.financialData);
      
      setTimeout(() => {
        setViewState("result");
      }, 1500);
    } else {
      setError(result.error || "Failed to fetch company info");
      setViewState("input");
    }
  };

  const renderLoadingPage = () => (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center animate-pulse">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -inset-3 border-4 border-primary/10 border-t-primary rounded-[2.5rem] animate-spin [animation-duration:1s]" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Processing Data</h1>
      <p className="text-slate-400 text-sm font-medium animate-pulse">Fetching information from FnGuide and KIND...</p>

      <div className="mt-12 w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ width: "40%" }} />
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground select-none overflow-hidden">
      {viewState === "input" && (
        <InputForm
          inputs={inputs}
          handleInputChange={handleInputChange}
          handleStartParsing={handleStartParsing}
          error={error}
          setIsPromptOpen={setIsPromptOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          aiOptions={aiOptions}
          setAiOptions={setAiOptions}
        />
      )}
      {viewState === "loading" && renderLoadingPage()}
      {viewState === "result" && (
        <ResultView
          inputs={inputs}
          setViewState={setViewState}
          companyDataAPI={companyDataAPI}
          geminiAPI={geminiAPI}
          setIsPromptOpen={setIsPromptOpen}
          setIsSettingsOpen={setIsSettingsOpen}
        />
      )}
      <SettingsModals
        isPromptOpen={isPromptOpen}
        setIsPromptOpen={setIsPromptOpen}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        geminiAPI={geminiAPI}
      />
    </div>
  );
};

export default App;
