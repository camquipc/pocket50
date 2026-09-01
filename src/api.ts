import { GAS_ENDPOINT } from "./config";

interface SubmitExpenseData {
  montoVES: number;
  tasa: number;
  categoria: string;
  descripcion: string;
  subcategoria: string;
  fecha?: string;
}

interface CategorySummary {
  spent: number;
  limit: number;
  pct: number;
}

interface Alert {
  category: string;
  label: string;
  spent: number;
  limit: number;
  over: number;
  message: string;
}

interface ExpenseResponse {
  success: boolean;
  summary?: Record<string, CategorySummary>;
  alerts?: Alert[];
  error?: string;
}

interface ConfigResponse {
  success: boolean;
  config?: {
    ingresoMensualUSD: number;
    mes: string;
  };
  error?: string;
}

export async function submitExpense(data: SubmitExpenseData): Promise<ExpenseResponse> {
  const res = await fetch(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getBudgetStatus(): Promise<ExpenseResponse> {
  const res = await fetch(GAS_ENDPOINT);
  return res.json();
}

export async function getConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${GAS_ENDPOINT}?action=config`);
  return res.json();
}

export async function saveConfig(ingresoMensualUSD: number): Promise<{ success: boolean }> {
  const res = await fetch(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ingresoMensualUSD }),
  });
  return res.json();
}
