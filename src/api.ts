import { GAS_ENDPOINT } from "./config";

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

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

class ApiError extends Error {
  constructor(
    message: string,
    public code: "timeout" | "network" | "server" | "parse",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithRetry<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ApiError(
          `Error del servidor (${res.status})`,
          "server",
        );
      }

      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new ApiError(
          "Respuesta inválida del servidor",
          "parse",
        );
      }
    } catch (err) {
      clearTimeout(timer);
      lastError = err as Error;

      if (err instanceof ApiError) throw err;

      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < MAX_RETRIES) continue;
        throw new ApiError(
          "Tiempo de espera agotado. Verifica tu conexión.",
          "timeout",
        );
      }

      if (attempt < MAX_RETRIES) continue;
      throw new ApiError(
        "No se pudo conectar al servidor. Verifica tu conexión.",
        "network",
      );
    }
  }

  throw lastError ?? new ApiError("Error desconocido", "network");
}

export { ApiError };

export async function submitExpense(data: SubmitExpenseData): Promise<ExpenseResponse> {
  return fetchWithRetry<ExpenseResponse>(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(data),
  });
}

export async function getBudgetStatus(): Promise<ExpenseResponse> {
  return fetchWithRetry<ExpenseResponse>(GAS_ENDPOINT);
}

export async function getConfig(): Promise<ConfigResponse> {
  return fetchWithRetry<ConfigResponse>(`${GAS_ENDPOINT}?action=config`);
}

export async function saveConfig(ingresoMensualUSD: number): Promise<{ success: boolean }> {
  return fetchWithRetry<{ success: boolean }>(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ingresoMensualUSD }),
  });
}
