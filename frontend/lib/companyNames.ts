const NIFTY20_NAMES: Record<string, string> = {
  RELIANCE: "Reliance Industries",
  TCS: "Tata Consultancy Services",
  INFY: "Infosys",
  HDFCBANK: "HDFC Bank",
  ICICIBANK: "ICICI Bank",
  WIPRO: "Wipro",
  HCLTECH: "HCL Technologies",
  BAJFINANCE: "Bajaj Finance",
  KOTAKBANK: "Kotak Mahindra Bank",
  LT: "Larsen & Toubro",
  ASIANPAINT: "Asian Paints",
  TITAN: "Titan Company",
  MARUTI: "Maruti Suzuki",
  TATAMOTORS: "Tata Motors",
  SUNPHARMA: "Sun Pharma",
  BHARTIARTL: "Bharti Airtel",
  ITC: "ITC",
  AXISBANK: "Axis Bank",
  SBIN: "State Bank of India",
  NESTLEIND: "Nestle India",
};

/** Human-readable company name; prefers API name, then Nifty 20 lookup. */
export function companyDisplayName(
  ticker: string,
  companies?: Array<{ ticker: string; name: string }>
): string {
  const fromList = companies?.find((c) => c.ticker === ticker)?.name;
  if (fromList) return fromList;
  const key = ticker.trim().toUpperCase();
  return NIFTY20_NAMES[key] ?? key;
}
