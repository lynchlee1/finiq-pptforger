import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export async function extractPriceTrendData(filePath?: string) {
  const targetPath = filePath || path.join(__dirname, '../../frontend/public/templates/Deal_Summary_Template_1.0/Model.xlsx');
  
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Excel file not found at: ${targetPath}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(targetPath);
  const ws = wb.getWorksheet('#주가');

  if (!ws) {
    throw new Error('Worksheet #주가 not found in excel file');
  }

  const getCellValue = (cell: ExcelJS.Cell | undefined) => {
    if (cell && cell.value !== undefined && cell.value !== null) {
      // @ts-ignore
      if (cell.value.result !== undefined) return cell.value.result;
      return cell.value;
    }
    return null;
  };

  const exercisePrice = getCellValue(ws.getCell('H6'));
  const premiumRate = getCellValue(ws.getCell('H3'));
  const baseDateExcel = getCellValue(ws.getCell('H2'));

  const data: any[] = [];
  let latestMarketCap: any = null;

  for (let r = 14; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    
    // Read A to E
    const rowList = [];
    let isRowEmpty = true;
    for (let c = 1; c <= 5; c++) {
      const val = getCellValue(row.getCell(c));
      rowList.push(val);
      if (val !== null) isRowEmpty = false;
    }

    if (isRowEmpty) continue;

    data.push(rowList);

    const dateVal = rowList[0];
    const marketCapVal = rowList[4];

    if (marketCapVal !== null && dateVal !== 'D A T E') {
      latestMarketCap = marketCapVal;
    }
  }

  return {
    data,
    latest_market_cap: latestMarketCap,
    exercise_price: exercisePrice,
    premium_rate: premiumRate,
    base_date: baseDateExcel instanceof Date ? baseDateExcel.toISOString() : baseDateExcel
  };
}

export async function extractFinancialData(filePath?: string) {
  const targetPath = filePath || path.join(__dirname, '../../frontend/public/templates/Deal_Summary_Template_1.0/Model.xlsx');
  if (!fs.existsSync(targetPath)) return { data: {}, missing: [] };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(targetPath);
  const ws = wb.getWorksheet('#보고서');
  if (!ws) return { data: {}, missing: [] };

  const getCellValue = (cell: ExcelJS.Cell | undefined) => {
    if (cell && cell.value !== undefined && cell.value !== null) {
      // @ts-ignore
      if (cell.value.result !== undefined) return cell.value.result;
      return cell.value;
    }
    return null;
  };

  const headerRow = ws.getRow(6);
  let sepCol23 = -1, sepCol24 = -1, sepCol25 = -1;
  let conCol23 = -1, conCol24 = -1, conCol25 = -1;
  
  for (let c = 1; c <= headerRow.cellCount; c++) {
    const val = String(getCellValue(headerRow.getCell(c))).trim();
    if (c <= 14) {
      if (val === '2023') sepCol23 = c;
      if (val === '2024') sepCol24 = c;
      if (val === '2025E' || val === '2025') sepCol25 = c;
    } else {
      if (val === '2023') conCol23 = c;
      if (val === '2024') conCol24 = c;
      if (val === '2025E' || val === '2025') conCol25 = c;
    }
  }

  const targets = ['자산총계', '순차입금', '부채비율', '차입금의존도', '매출액', '영업이익', '영업이익률', '당기순이익', '당기순이익률'];
  
  const extractRowData = (rowNum: number, isCon: boolean) => {
    const row = ws.getRow(rowNum);
    const col23 = isCon ? conCol23 : sepCol23;
    const col24 = isCon ? conCol24 : sepCol24;
    const col25 = isCon ? conCol25 : sepCol25;
    
    // Return formatted values (if number, format to 2 decimal places or just raw)
    const formatVal = (v: any) => {
      if (typeof v === 'number') {
        // Just return as is, or we can format later
        return v;
      }
      return v;
    }
    return {
      2023: col23 !== -1 ? formatVal(getCellValue(row.getCell(col23))) : null,
      2024: col24 !== -1 ? formatVal(getCellValue(row.getCell(col24))) : null,
      2025: col25 !== -1 ? formatVal(getCellValue(row.getCell(col25))) : null,
    };
  };

  const parsedData: Record<string, any> = {};
  const missing: string[] = [];

  const matchLabel = (label: string, target: string) => {
    const cleanLabel = label.replace(/\s/g, '');
    if (target === '당기순이익') {
       return cleanLabel.startsWith('당기순이익') && !cleanLabel.includes('률');
    }
    if (target === '영업이익') {
       return cleanLabel.startsWith('영업이익') && !cleanLabel.includes('률');
    }
    return cleanLabel.includes(target);
  };

  for (const t of targets) {
    let foundConRow = -1;
    let foundSepRow = -1;
    
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const sepLabel = String(getCellValue(row.getCell(2)) || '').trim();
      const conLabel = String(getCellValue(row.getCell(16)) || '').trim();
      
      if (matchLabel(conLabel, t)) foundConRow = r;
      if (matchLabel(sepLabel, t)) foundSepRow = r;
    }

    if (foundConRow !== -1) {
      parsedData[t] = extractRowData(foundConRow, true);
    } else if (foundSepRow !== -1) {
      parsedData[t] = extractRowData(foundSepRow, false);
    } else {
      missing.push(t);
    }
  }

  return { data: parsedData, missing };
}
