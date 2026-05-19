import React, { useMemo, useState } from "react";
import { ChevronLeft, FileText, RefreshCw, Settings } from "lucide-react";
import { SummarySection } from "./SummarySection";
import { InvestmentPoints } from "./InvestmentPoints";
import { PricePoints } from "./PricePoints";
import { RiskPoints } from "./RiskPoints";
import { ShareholdersTable } from "./ShareholdersTable";
import { OwnershipTable } from "./OwnershipTable";
import { useOwnershipCalculation } from "../hooks/useOwnershipCalculation";

interface Props {
  inputs: any;
  setViewState: (val: "input" | "loading" | "result") => void;
  companyDataAPI: any;
  geminiAPI: any;
  setIsPromptOpen: (val: boolean) => void;
  setIsSettingsOpen: (val: boolean) => void;
}

export const ResultView: React.FC<Props> = ({ inputs, setViewState, companyDataAPI, geminiAPI, setIsPromptOpen, setIsSettingsOpen }) => {
  const [maxShareholders, setMaxShareholders] = useState<number>(10);
  const [callPercent, setCallPercent] = useState("");
  const [refixingPercent, setRefixingPercent] = useState("");
  const [priorMezzanineShares, setPriorMezzanineShares] = useState("");
  const [isTreasuryEb, setIsTreasuryEb] = useState(false);

  const displayedShareholders = useMemo(() => {
    if (companyDataAPI.shareholders.length <= maxShareholders) return companyDataAPI.shareholders;
    const top = companyDataAPI.shareholders.slice(0, maxShareholders);
    const rest = companyDataAPI.shareholders.slice(maxShareholders);
    const otherShares = rest.reduce((acc: number, sh: any) => acc + (parseInt(sh.shares.replace(/,/g, "")) || 0), 0);
    const otherRatio = rest.reduce((acc: number, sh: any) => acc + (parseFloat(sh.ratio) || 0), 0);
    return [
      ...top,
      {
        name: "기타특관자",
        relation: "특수관계인",
        shares: otherShares.toLocaleString(),
        ratio: otherRatio.toFixed(2),
        callEnabled: rest.some((sh: any) => sh.callEnabled !== false),
      },
    ];
  }, [companyDataAPI.shareholders, maxShareholders]);

  const displayedShareholdersWithRatio = useMemo(() => {
    return displayedShareholders;
  }, [displayedShareholders]);

  const { ownershipCases, ownershipRowNames } = useOwnershipCalculation({
    totalIssuedShares: companyDataAPI.totalIssuedShares,
    exercisePrice: companyDataAPI.exercisePrice,
    issueAmt: inputs.issue_amt,
    investmentAmt: inputs.investment_amt,
    priorMezzanineShares,
    callPercent,
    refixingPercent,
    displayedShareholdersWithRatio,
    shareholderClassification: companyDataAPI.shareholderClassification,
    isTreasuryEb,
    mezzTypeEng: companyDataAPI.mezzTypeEng,
    newIssuedShares: companyDataAPI.newIssuedShares,
  });

  const handleInputToPPT = async () => {
    try {
      let investAmt = inputs.investment_amt.replace(/,/g, "").trim();
      if (inputs.investment_amt.includes("억원")) investAmt = "100";

      const pptData = {
        corp_name: companyDataAPI.companyName,
        name_end: companyDataAPI.nameEnd,
        corp_name_full: companyDataAPI.corpNameFull,
        stock_market: companyDataAPI.stockMarket,
        stock_code: inputs.stock_code,
        mezz_type_kor: companyDataAPI.mezzTypeKor,
        mezz_type_eng: companyDataAPI.mezzTypeEng,
        mezz_type: inputs.mezz_type_full,
        invest_amt: !isNaN(Number(investAmt)) ? Number(investAmt).toLocaleString() : investAmt,
        issue_amt: !isNaN(Number(inputs.issue_amt.replace(/,/g, ""))) ? Number(inputs.issue_amt.replace(/,/g, "")).toLocaleString() : inputs.issue_amt,
        market_cap: companyDataAPI.marketCap ? Math.round(companyDataAPI.marketCap / 1e8).toLocaleString() : "",
        ex_prc: companyDataAPI.exercisePrice ? companyDataAPI.exercisePrice.toLocaleString() : "",
        report_date: companyDataAPI.reportDate,
        base_date: companyDataAPI.baseDate,
        call_percent: callPercent,
        refixing_percent: refixingPercent,
        corp_summary: "",
        investment_text_title1: geminiAPI.investmentPoints[0]?.title || "",
        investment_text_contents1_1: geminiAPI.investmentPoints[0]?.contents1 || "",
        investment_text_contents1_2: geminiAPI.investmentPoints[0]?.contents2 || "",
        investment_text_title2: geminiAPI.investmentPoints[1]?.title || "",
        investment_text_contents2_1: geminiAPI.investmentPoints[1]?.contents1 || "",
        investment_text_contents2_2: geminiAPI.investmentPoints[1]?.contents2 || "",
        investment_text_title3: geminiAPI.investmentPoints[2]?.title || "",
        investment_text_contents3_1: geminiAPI.investmentPoints[2]?.contents1 || "",
        investment_text_contents3_2: geminiAPI.investmentPoints[2]?.contents2 || "",
        price_text_title1: geminiAPI.pricePoints?.[0]?.title || "",
        price_text_title2: geminiAPI.pricePoints?.[1]?.title || "",
        risk_text_title1: geminiAPI.riskPoints?.[0]?.title || "",
        risk_text_contents1_1: geminiAPI.riskPoints?.[0]?.contents1 || "",
        risk_text_title2: geminiAPI.riskPoints?.[1]?.title || "",
        risk_text_contents2_1: geminiAPI.riskPoints?.[1]?.contents1 || "",
        premium_text: companyDataAPI.premiumText,
        ...displayedShareholdersWithRatio.reduce(
          (acc: any, sh: any, idx: number) => ({
            ...acc,
            [`sh_name_${idx + 1}`]: sh.name,
            [`sh_relation_${idx + 1}`]: sh.relation,
            [`sh_shares_${idx + 1}`]: sh.shares,
            [`sh_ratio_${idx + 1}`]: sh.ratio,
          }),
          {}
        ),
      };

      // Generate ownershipTableData for PPT (10 rows x 11 cols)
      // Rows: [Major1, Major2, Major3, 기타특관자, 자사주, 기타주주, CB(당사), CB(공동투자자), 기발행 메자닌, 합계]
      const ownershipTableData: string[][] = [];
      const rowMapping = [
        displayedShareholdersWithRatio[0]?.name || "",
        displayedShareholdersWithRatio[1]?.name || "",
        displayedShareholdersWithRatio[2]?.name || "",
        "기타특관자",
        "자사주",
        "기타주주",
        `${companyDataAPI.mezzTypeEng || "CB"}(당사)`,
        `${companyDataAPI.mezzTypeEng || "CB"}(공동투자자)`,
        "기발행 메자닌",
        "합계"
      ];

      for (const targetName of rowMapping) {
        if (!targetName) {
          ownershipTableData.push(Array(11).fill(""));
          continue;
        }
        
        const rowData = [targetName];
        let foundInCases = false;
        
        for (let i = 0; i < 5; i++) {
          const oCase = ownershipCases[i];
          if (!oCase) {
            rowData.push("", "");
            continue;
          }
          
          const row = oCase.rows.find((item) => item.name === targetName);
          const shares = targetName === "합계" ? oCase.totalShares : row?.shares || 0;
          const ratio = oCase.denominatorShares > 0 ? (shares / oCase.denominatorShares) * 100 : 0;
          
          if (shares > 0 || targetName === "합계") {
            foundInCases = true;
            rowData.push(shares.toLocaleString());
            rowData.push(`${ratio.toFixed(1)}%`);
          } else {
            rowData.push("-", "-");
          }
        }
        
        // Handle "기타특관자" if it was not in the original data but we need the row to be empty rather than showing '-'
        if (!foundInCases && targetName !== "합계" && targetName !== "자사주" && targetName !== "기타주주" && !targetName.includes("(당사)") && !targetName.includes("(공동투자자)") && targetName !== "기발행 메자닌") {
          ownershipTableData.push(Array(11).fill(""));
        } else {
          ownershipTableData.push(rowData);
        }
      }
      
      pptData.ownershipTableData = ownershipTableData;

      // @ts-ignore
      const result = await window.electronAPI.generatePPT(pptData);
      if (result.success) {
        alert(`PPT generated successfully!\nPath: ${result.path}`);
      } else {
        alert(`Failed to generate PPT: ${result.error}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`An error occurred: ${err.message}`);
    }
  };

  const toggleCallEnabled = (displayIndex: number, value: boolean) => {
    companyDataAPI.setShareholders((prev: any) =>
      prev.map((sh: any, idx: number) => {
        if (displayIndex < maxShareholders) return idx === displayIndex ? { ...sh, callEnabled: value } : sh;
        return idx >= maxShareholders ? { ...sh, callEnabled: value } : sh;
      })
    );
  };

  const moveShareholder = (index: number, direction: "up" | "down") => {
    const newShareholders = [...companyDataAPI.shareholders];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newShareholders.length) return;
    const temp = newShareholders[index];
    newShareholders[index] = newShareholders[targetIndex];
    newShareholders[targetIndex] = temp;
    companyDataAPI.setShareholders(newShareholders);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-y-auto">
      <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setViewState("input")} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{companyDataAPI.companyName || "Search Result"}</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Code: {inputs.stock_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsPromptOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm" title="Prompt Settings">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm" title="API Settings">
            <Settings className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={handleInputToPPT} className="px-5 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20">
            <FileText className="w-4 h-4" />
            PPT 입력하기
          </button>
          <button onClick={() => setViewState("input")} className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
            <RefreshCw className="w-4 h-4" />
            New Search
          </button>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <SummarySection companyDataAPI={companyDataAPI} />
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-12">
          <InvestmentPoints
            investmentPoints={geminiAPI.investmentPoints}
            setInvestmentPoints={geminiAPI.setInvestmentPoints}
            isGenerating={geminiAPI.isGenerating}
            hasApiKeys={geminiAPI.validApiKeys?.length > 0}
            companyName={companyDataAPI.companyName}
            stockCode={inputs.stock_code}
            handleGenerateInvestmentPoints={geminiAPI.handleGenerateInvestmentPoints}
          />
          <PricePoints
            pricePoints={geminiAPI.pricePoints}
            setPricePoints={geminiAPI.setPricePoints}
            isGenerating={geminiAPI.isGeneratingPrice}
            hasApiKeys={geminiAPI.validApiKeys?.length > 0}
            companyName={companyDataAPI.companyName}
            stockCode={inputs.stock_code}
            handleGeneratePrice={geminiAPI.handleGeneratePrice}
          />
          <RiskPoints
            riskPoints={geminiAPI.riskPoints}
            setRiskPoints={geminiAPI.setRiskPoints}
            isGenerating={geminiAPI.isGeneratingRisk}
            hasApiKeys={geminiAPI.validApiKeys?.length > 0}
            companyName={companyDataAPI.companyName}
            stockCode={inputs.stock_code}
            financialData={companyDataAPI.financialData}
            handleGenerateRisk={geminiAPI.handleGenerateRisk}
          />
        </div>

        <ShareholdersTable
          shareholders={companyDataAPI.shareholders}
          displayedShareholdersWithRatio={displayedShareholdersWithRatio}
          maxShareholders={maxShareholders}
          setMaxShareholders={setMaxShareholders}
          toggleCallEnabled={toggleCallEnabled}
          moveShareholder={moveShareholder}
        />

        <OwnershipTable
          isTreasuryEb={isTreasuryEb}
          setIsTreasuryEb={setIsTreasuryEb}
          mezzTypeEng={companyDataAPI.mezzTypeEng}
          callPercent={callPercent}
          setCallPercent={setCallPercent}
          refixingPercent={refixingPercent}
          setRefixingPercent={setRefixingPercent}
          priorMezzanineShares={priorMezzanineShares}
          setPriorMezzanineShares={setPriorMezzanineShares}
          ownershipCases={ownershipCases}
          ownershipRowNames={ownershipRowNames}
        />

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">주주구분 현황</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">주주구분</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">보통주</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companyDataAPI.shareholderClassification.length > 0 ? (
                  companyDataAPI.shareholderClassification.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.category}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">{item.shares}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">No classification data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};
