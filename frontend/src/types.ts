export type AppState = "input" | "loading" | "result";

export interface Shareholder {
  name: string;
  relation: string;
  shares: string;
  ratio: string;
  callEnabled?: boolean;
}

export interface ShareholderClassification {
  category: string;
  shares: string;
}

export interface CompanyData {
  corp_name_en: string;
  establishment_date: string;
  representative: string;
  listing_date: string;
  capital: string;
  employees: string;
  fiscal_month: string;
  phone: string;
  industry: string;
  main_products: string;
  address: string;
  homepage: string;
}

export interface OwnershipRow {
  name: string;
  shares: number;
  isTreasury?: boolean;
  isMajor?: boolean;
  callEnabled?: boolean;
  ratio?: number;
}

export interface OwnershipCase {
  label: string;
  rows: OwnershipRow[];
  totalShares: number;
  denominatorShares: number;
}
