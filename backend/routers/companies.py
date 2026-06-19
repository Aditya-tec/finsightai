from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()

NIFTY20 = [
    {"ticker": "RELIANCE", "name": "Reliance Industries", "sector": "Energy"},
    {"ticker": "TCS", "name": "Tata Consultancy Services", "sector": "IT"},
    {"ticker": "INFY", "name": "Infosys", "sector": "IT"},
    {"ticker": "HDFCBANK", "name": "HDFC Bank", "sector": "Banking"},
    {"ticker": "ICICIBANK", "name": "ICICI Bank", "sector": "Banking"},
    {"ticker": "WIPRO", "name": "Wipro", "sector": "IT"},
    {"ticker": "HCLTECH", "name": "HCL Technologies", "sector": "IT"},
    {"ticker": "BAJFINANCE", "name": "Bajaj Finance", "sector": "Financials"},
    {"ticker": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking"},
    {"ticker": "LT", "name": "Larsen & Toubro", "sector": "Industrials"},
    {"ticker": "ASIANPAINT", "name": "Asian Paints", "sector": "Consumer"},
    {"ticker": "TITAN", "name": "Titan Company", "sector": "Consumer"},
    {"ticker": "MARUTI", "name": "Maruti Suzuki", "sector": "Automobile"},
    {"ticker": "TATAMOTORS", "name": "Tata Motors", "sector": "Automobile"},
    {"ticker": "SUNPHARMA", "name": "Sun Pharma", "sector": "Healthcare"},
    {"ticker": "BHARTIARTL", "name": "Bharti Airtel", "sector": "Telecom"},
    {"ticker": "ITC", "name": "ITC", "sector": "Consumer"},
    {"ticker": "AXISBANK", "name": "Axis Bank", "sector": "Banking"},
    {"ticker": "SBIN", "name": "State Bank of India", "sector": "Banking"},
    {"ticker": "NESTLEIND", "name": "Nestle India", "sector": "Consumer"},
]


@router.get("/companies")
async def companies():
    return NIFTY20
