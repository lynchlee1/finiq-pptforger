import { useMemo } from "react";
import { parseInteger, parseNumber, parseKrwAmount, formatPercentLabel } from "../utils/numberUtils";
import { Shareholder, ShareholderClassification, OwnershipCase, OwnershipRow } from "../types";

interface UseOwnershipCalculationProps {
  totalIssuedShares: number;
  exercisePrice: number | null;
  issueAmt: string;
  investmentAmt: string;
  priorMezzanineShares: string;
  callPercent: string;
  refixingPercent: string;
  displayedShareholdersWithRatio: Shareholder[];
  shareholderClassification: ShareholderClassification[];
  isTreasuryEb: boolean;
  mezzTypeEng: string;
  newIssuedShares: number | null;
}

export function useOwnershipCalculation({
  totalIssuedShares,
  exercisePrice,
  issueAmt,
  investmentAmt,
  priorMezzanineShares,
  callPercent,
  refixingPercent,
  displayedShareholdersWithRatio,
  shareholderClassification,
  isTreasuryEb,
  mezzTypeEng,
  newIssuedShares,
}: UseOwnershipCalculationProps) {
  
  const ownershipCases = useMemo<OwnershipCase[]>(() => {
    const baseTotal = totalIssuedShares || 0;
    const basePrice = exercisePrice || 0;
    const issueAmount = parseKrwAmount(issueAmt);
    const investmentAmount = parseKrwAmount(investmentAmt);
    const coInvestmentAmount = Math.max(issueAmount - investmentAmount, 0);
    const priorShares = parseInteger(priorMezzanineShares);
    const callRate = Math.min(Math.max(parseNumber(callPercent) / 100, 0), 1);
    const refixingRate = Math.min(Math.max(parseNumber(refixingPercent) / 100, 0), 1);
    const hasCall = callRate > 0;
    const hasRefixing = refixingRate > 0;

    const majorRows = displayedShareholdersWithRatio.map((sh) => ({
      name: sh.name,
      shares: parseInteger(sh.shares),
      isMajor: true,
      callEnabled: sh.callEnabled !== false,
      ratio: parseNumber(sh.ratio) / 100,
    }));
    const majorShares = majorRows.reduce((sum, row) => sum + row.shares, 0);
    const treasuryFromClassification = shareholderClassification
      .filter((item) => /자기주식|자사주/.test(item.category))
      .reduce((sum, item) => sum + parseInteger(item.shares), 0);
    const treasuryAlreadyInMajor = majorRows.some((row) => /자기주식|자사주/.test(row.name));
    const treasuryShares = treasuryAlreadyInMajor ? 0 : treasuryFromClassification;
    
    const employeeShares = shareholderClassification
      .filter((item) => /우리사주/.test(item.category))
      .reduce((sum, item) => sum + parseInteger(item.shares), 0);
    const employeeAlreadyInMajor = majorRows.some((row) => /우리사주/.test(row.name));
    const separateEmployeeShares = employeeAlreadyInMajor ? 0 : employeeShares;
    
    const otherShares = Math.max(baseTotal - majorShares - treasuryShares - separateEmployeeShares, 0);

    const baseRows: OwnershipRow[] = [
      ...majorRows,
      ...(treasuryShares > 0 ? [{ name: "자사주", shares: treasuryShares, isTreasury: true }] : []),
      ...(separateEmployeeShares > 0 ? [{ name: "우리사주", shares: separateEmployeeShares }] : []),
      { name: "기타주주", shares: otherShares },
    ];

    const convertFaceValue = (amount: number, price: number) => {
      if (!amount || !price) return 0;
      return Math.floor(amount / price);
    };

    const convertWithFallback = (amount: number, price: number, activeRefixingRate: number) => {
      const converted = convertFaceValue(amount, price);
      if (converted > 0 || !investmentAmount || !newIssuedShares) return converted;
      const refixingMultiplier = activeRefixingRate > 0 ? 1 / activeRefixingRate : 1;
      return Math.floor(((newIssuedShares * amount) / investmentAmount) * refixingMultiplier);
    };

    const buildCase = (label: string, options: { callRate?: number; refixingRate?: number }): OwnershipCase => {
      const price = options.refixingRate && options.refixingRate > 0 ? Math.floor(basePrice * options.refixingRate) : basePrice;
      const activeCallRate = options.callRate || 0;
      const activeRefixingRate = options.refixingRate || 0;
      const ownAmount = investmentAmount * (1 - activeCallRate);
      const coAmount = coInvestmentAmount * (1 - activeCallRate);
      const ownConverted = convertWithFallback(ownAmount, price, activeRefixingRate);
      const coConverted = convertWithFallback(coAmount, price, activeRefixingRate);
      const callPool = convertWithFallback(issueAmount * activeCallRate, price, activeRefixingRate);
      const totalConverted = ownConverted + coConverted + callPool;
      const finalTotal = baseTotal + priorShares + (isTreasuryEb ? 0 : totalConverted);
      const denominatorShares = finalTotal;

      const rows = baseRows.map((row) => ({ ...row }));
      const treasuryRow = rows.find((row) => row.isTreasury);
      let remainingCallPool = callPool;

      if (activeCallRate > 0 && baseTotal > 0) {
        for (const row of rows) {
          if (!row.isMajor || row.callEnabled === false) continue;
          const beforeRatio = row.ratio !== undefined ? row.ratio : (row.shares / baseTotal);
          
          // 규정에 따라 (발행 당시 지분율) x (당해 메자닌 발행 주식수)로 한도 제한
          const exercisableShares = Math.floor(beforeRatio * totalConverted);
          
          const calledShares = Math.min(exercisableShares, remainingCallPool);
          row.shares += calledShares;
          remainingCallPool -= calledShares;
          if (remainingCallPool <= 0) break;
        }

        if (remainingCallPool > 0) {
          if (treasuryRow) {
            treasuryRow.shares += remainingCallPool;
          } else {
            rows.push({ name: "자사주", shares: remainingCallPool, isTreasury: true });
          }
        }
      }

      if (isTreasuryEb && treasuryRow) {
        treasuryRow.shares = Math.max(treasuryRow.shares - totalConverted, 0);
      }

      rows.push({ name: `${mezzTypeEng || "CB"}(당사)`, shares: ownConverted });
      rows.push({ name: `${mezzTypeEng || "CB"}(공동투자자)`, shares: coConverted });
      rows.push({ name: "기발행 메자닌", shares: priorShares });

      const actualTotalShares = rows.reduce((sum, r) => sum + r.shares, 0);
      return { label, rows, totalShares: actualTotalShares, denominatorShares: actualTotalShares };
    };

    const baseTotalShares = baseRows.reduce((sum, r) => sum + r.shares, 0);
    const cases: OwnershipCase[] = [
      { label: "메자닌 발행 전", rows: baseRows, totalShares: baseTotalShares, denominatorShares: baseTotalShares },
      buildCase("금차 메자닌 전환 후", {}),
    ];

    if (hasCall) cases.push(buildCase(`Call ${formatPercentLabel(callPercent)}%`, { callRate }));
    if (hasRefixing) cases.push(buildCase(`리픽싱 ${formatPercentLabel(refixingPercent)}%`, { refixingRate }));
    if (hasCall && hasRefixing) cases.push(buildCase(`Call ${formatPercentLabel(callPercent)}%, 리픽싱 ${formatPercentLabel(refixingPercent)}%`, { callRate, refixingRate }));

    return cases;
  }, [
    totalIssuedShares,
    exercisePrice,
    issueAmt,
    investmentAmt,
    priorMezzanineShares,
    callPercent,
    refixingPercent,
    displayedShareholdersWithRatio,
    shareholderClassification,
    isTreasuryEb,
    mezzTypeEng,
    newIssuedShares,
  ]);

  const ownershipRowNames = useMemo(() => {
    const names: string[] = [];
    ownershipCases.forEach((ownershipCase) => {
      ownershipCase.rows.forEach((row) => {
        if (!names.includes(row.name)) names.push(row.name);
      });
    });
    names.push("합계");
    return names;
  }, [ownershipCases]);

  return { ownershipCases, ownershipRowNames };
}
