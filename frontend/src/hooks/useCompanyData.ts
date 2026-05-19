import { useState } from "react";
import { Shareholder, ShareholderClassification, CompanyData } from "../types";

export function useCompanyData() {
  const [companyName, setCompanyName] = useState("");
  const [corpNameFull, setCorpNameFull] = useState("");
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [totalIssuedShares, setTotalIssuedShares] = useState<number>(0);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [shareholderClassification, setShareholderClassification] = useState<ShareholderClassification[]>([]);
  const [stockMarket, setStockMarket] = useState<string>("");

  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [exercisePrice, setExercisePrice] = useState<number | null>(null);
  const [premiumRate, setPremiumRate] = useState<number | string>(0);
  const [baseDateExcel, setBaseDateExcel] = useState<string>("");
  const [newIssuedShares, setNewIssuedShares] = useState<number | null>(null);

  const [mezzTypeKor, setMezzTypeKor] = useState("");
  const [mezzTypeEng, setMezzTypeEng] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [baseDate, setBaseDate] = useState("");
  const [premiumText, setPremiumText] = useState("");
  const [nameEnd, setNameEnd] = useState("");
  const [financialData, setFinancialData] = useState<any>(null);

  const fetchCompanyData = async (
    stockCode: string,
    mezzTypeFull: string,
    investmentAmt: string
  ): Promise<{ success: boolean; error?: string; financialData?: any }> => {
    // Determine Mezz Type
    const full = mezzTypeFull;
    let kor = "";
    let eng = "";

    if (full.includes("신주인수권부사채") || full.toUpperCase().includes("BW")) {
      kor = "신주인수권부사채";
      eng = "BW";
    } else if (full.includes("전환사채") || full.toUpperCase().includes("CB")) {
      kor = "전환사채";
      eng = "CB";
    } else if (full.includes("교환사채") || full.toUpperCase().includes("EB")) {
      kor = "교환사채";
      eng = "EB";
    }

    setMezzTypeKor(kor);
    setMezzTypeEng(eng);

    try {
      // @ts-ignore
      const result = await window.electronAPI.fetchCompanyInfo(stockCode);
      if (!result.success) {
        return { success: false, error: result.error || "Failed to fetch company info" };
      }

      setCompanyName(result.corp_name);
      setCorpNameFull(result.corp_name_full);
      setCompanyData(result.companyData);
      setTotalIssuedShares(result.totalIssuedShares);
      setShareholders(result.shareholders.map((sh: Shareholder) => ({ ...sh, callEnabled: sh.callEnabled !== false })));
      setShareholderClassification(result.shareholderClassification);
      setStockMarket(result.stock_market);

      let currentBaseDateExcel = "";
      let currentPremiumRate: number | string = 0;
      let fetchedFinancialData: any = null;

      try {
        // @ts-ignore
        const excelData = await window.electronAPI.readExcelData();
        if (excelData && !excelData.error) {
          setMarketCap(excelData.latest_market_cap);
          if (excelData.financialData) {
            setFinancialData(excelData.financialData);
            fetchedFinancialData = excelData.financialData;
          }
          if (excelData.missingFinancials && excelData.missingFinancials.length > 0) {
            alert(`엑셀에서 다음 항목을 찾을 수 없습니다:\n${excelData.missingFinancials.join(', ')}`);
          }
          const roundedExercisePrice = typeof excelData.exercise_price === "number" ? Math.floor(excelData.exercise_price) : excelData.exercise_price;
          setExercisePrice(roundedExercisePrice);
          setPremiumRate(excelData.premium_rate || 0);
          setBaseDateExcel(excelData.base_date || "");

          currentBaseDateExcel = excelData.base_date || "";
          currentPremiumRate = excelData.premium_rate || 0;

          const investmentAmountNum = parseFloat(investmentAmt.replace(/[^0-9.]/g, ""));
          if (!isNaN(investmentAmountNum) && roundedExercisePrice > 0) {
            setNewIssuedShares(Math.floor((investmentAmountNum * Math.pow(10, 8)) / roundedExercisePrice));
          } else {
            setNewIssuedShares(null);
          }
        }
      } catch (excelErr) {
        console.error("Failed to load excel data:", excelErr);
      }

      // Calculate Derived Values
      const today = new Date();
      const nextMonday = new Date(today);
      const daysUntilMonday = (1 + 7 - today.getDay()) % 7;
      nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      const rDateStr = `${nextMonday.getFullYear()}. ${String(nextMonday.getMonth() + 1).padStart(2, "0")}. ${String(nextMonday.getDate()).padStart(2, "0")}`;
      setReportDate(rDateStr);

      const hasBatchim = (word: string) => {
        if (!word) return false;
        const lastChar = word.charCodeAt(word.length - 1);
        if (lastChar < 0xac00 || lastChar > 0xd7a3) return false;
        return (lastChar - 0xac00) % 28 !== 0;
      };
      setNameEnd(hasBatchim(result.corp_name) ? "이" : "가");

      let bDateStr = "";
      if (currentBaseDateExcel) {
        const bDate = new Date(currentBaseDateExcel);
        if (!isNaN(bDate.getTime())) {
          bDateStr = `${String(bDate.getMonth() + 1).padStart(2, "0")}/${String(bDate.getDate()).padStart(2, "0")}`;
        } else {
          bDateStr = currentBaseDateExcel;
        }
      } else {
        bDateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
      }
      setBaseDate(bDateStr);

      let pRateVal = 0;
      if (typeof currentPremiumRate === "number") {
        pRateVal = currentPremiumRate;
      } else if (typeof currentPremiumRate === "string") {
        pRateVal = parseFloat(currentPremiumRate.replace(/[^0-9.]/g, "")) || 0;
      }
      if (pRateVal > 0 && pRateVal < 1) pRateVal = pRateVal * 100;
      const pText = pRateVal > 0 ? `${pRateVal}% 할증` : "기준가 par 발행";
      setPremiumText(pText);

      return { success: true, financialData: fetchedFinancialData };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || "An unexpected error occurred" };
    }
  };

  return {
    companyName, setCompanyName,
    corpNameFull, setCorpNameFull,
    companyData, setCompanyData,
    totalIssuedShares, setTotalIssuedShares,
    shareholders, setShareholders,
    shareholderClassification, setShareholderClassification,
    stockMarket, setStockMarket,
    marketCap, setMarketCap,
    exercisePrice, setExercisePrice,
    premiumRate, setPremiumRate,
    baseDateExcel, setBaseDateExcel,
    newIssuedShares, setNewIssuedShares,
    mezzTypeKor, setMezzTypeKor,
    mezzTypeEng, setMezzTypeEng,
    reportDate, setReportDate,
    baseDate, setBaseDate,
    premiumText, setPremiumText,
    nameEnd, setNameEnd,
    financialData, setFinancialData,
    fetchCompanyData
  };
}
