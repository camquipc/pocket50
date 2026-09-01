import { useState, useEffect, useCallback } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { BudgetDashboard } from "./BudgetDashboard";
import { AlertToast } from "./AlertToast";
import { getBudgetStatus, submitExpense, ApiError } from "./api";
import { CATEGORIES } from "./config";
import "./index.css";

type CategoryKey = keyof typeof CATEGORIES;

interface CategoryData {
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

const DEFAULT_SUMMARY: Record<string, CategoryData> = {
  need: { spent: 0, limit: 0, pct: 0 },
  want: { spent: 0, limit: 0, pct: 0 },
  saving: { spent: 0, limit: 0, pct: 0 },
};

export function App() {
  const [summary, setSummary] = useState<Record<string, CategoryData>>(DEFAULT_SUMMARY);
  const [ingresoMensual, setIngresoMensual] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getBudgetStatus();
      if (data.success && data.summary) {
        setSummary(data.summary);
        const needLimit = data.summary.need?.limit || 0;
        setIngresoMensual(Math.round(needLimit * 2 * 100) / 100);
      }
      if (data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "No se pudo conectar al servidor. Verifica tu conexión.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (data: {
    montoVES: number;
    tasa: number;
    categoria: CategoryKey;
    descripcion: string;
    subcategoria: string;
  }) => {
    const result = await submitExpense({
      ...data,
      categoria: data.categoria,
    });

    if (result.success) {
      // Actualizar estado con la respuesta del servidor
      if (result.summary) setSummary(result.summary);
      if (result.alerts) setAlerts(result.alerts);
    } else {
      throw new Error(result.error || "Error al enviar gasto");
    }
  };

  return (
    <div className="min-h-screen bg-[#242422] p-4 relative z-10">
      {/* Alertas */}
      <AlertToast alerts={alerts} onDismiss={() => setAlerts([])} />

      <div className="max-w-md mx-auto flex flex-col gap-6 py-6">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold text-[#fbf0df]">Tasa5030</h1>
          <p className="text-[#fbf0df]/70 text-sm">Finanzas personales • Regla 50/30/20</p>
        </header>

        {/* Loading */}
        {loading && (
          <div className="text-center text-[#fbf0df]/70 py-8">
            Cargando datos...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300 text-center flex flex-col gap-3">
            <p>{error}</p>
            <button
              onClick={fetchData}
              className="mx-auto px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Dashboard */}
        {!loading && !error && (
          <BudgetDashboard summary={summary} ingresoMensual={ingresoMensual} />
        )}

        {/* Formulario */}
        <ExpenseForm onSubmit={handleSubmit} disabled={loading} />

        {/* Footer */}
        <footer className="text-center text-[#fbf0df]/50 text-xs py-4">
          Pocket50 • Finanzas en VES/USD
        </footer>
      </div>
    </div>
  );
}

export default App;
