import { useState, useEffect, useCallback, type FormEvent } from "react";
import { CATEGORIES, SYNONYM_MAP } from "./config";

type CategoryKey = keyof typeof CATEGORIES;

interface ExpenseFormProps {
  onSubmit: (data: {
    montoVES: number;
    tasa: number;
    categoria: CategoryKey;
    descripcion: string;
    subcategoria: string;
  }) => Promise<void>;
  disabled?: boolean;
}

function suggestCategory(text: string): CategoryKey | null {
  const lower = text.toLowerCase();
  for (const [cat, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const syn of synonyms) {
      if (lower.includes(syn)) {
        return cat as CategoryKey;
      }
    }
  }
  return null;
}

export function ExpenseForm({ onSubmit, disabled }: ExpenseFormProps) {
  const [montoVES, setMontoVES] = useState("");
  const [tasa, setTasa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<CategoryKey | "">("");
  const [submitting, setSubmitting] = useState(false);

  const montoVESNum = parseFloat(montoVES) || 0;
  const tasaNum = parseFloat(tasa) || 1;
  const montoUSD = montoVESNum > 0 ? montoVESNum / tasaNum : 0;

  // Auto-sugerir categoría al escribir descripción
  const handleDescripcionChange = useCallback((value: string) => {
    setDescripcion(value);
    if (!categoria) {
      const suggested = suggestCategory(value);
      if (suggested) setCategoria(suggested);
    }
  }, [categoria]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!montoVESNum || !tasaNum || !categoria || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({
        montoVES: montoVESNum,
        tasa: tasaNum,
        categoria: categoria as CategoryKey,
        descripcion,
        subcategoria: "",
      });
      // Limpiar formulario después de enviar
      setMontoVES("");
      setDescripcion("");
      setCategoria("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-[#1a1a1a] rounded-xl border-2 border-[#fbf0df]">
      <h2 className="text-xl font-bold text-[#fbf0df]">Registrar Gasto</h2>

      {/* Monto en VES */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[#fbf0df]/70">Monto en Bs.</label>
        <input
          type="number"
          value={montoVES}
          onChange={(e) => setMontoVES(e.target.value)}
          placeholder="45000"
          min="0"
          step="0.01"
          required
          className="bg-transparent border-2 border-[#fbf0df]/30 rounded-lg px-3 py-2 text-[#fbf0df] font-mono text-lg focus:border-[#f3d5a3] outline-none transition-colors"
        />
      </div>

      {/* Tasa de cambio */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[#fbf0df]/70">Tasa (Bs./$)</label>
        <input
          type="number"
          value={tasa}
          onChange={(e) => setTasa(e.target.value)}
          placeholder="36.50"
          min="0.01"
          step="0.01"
          required
          className="bg-transparent border-2 border-[#fbf0df]/30 rounded-lg px-3 py-2 text-[#fbf0df] font-mono text-lg focus:border-[#f3d5a3] outline-none transition-colors"
        />
      </div>

      {/* Monto USD (calculado) */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[#fbf0df]/70">Monto en $ USD</label>
        <div className="bg-[#242424] border-2 border-[#fbf0df]/20 rounded-lg px-3 py-2 font-mono text-lg text-[#f3d5a3]">
          {montoUSD > 0 ? `$${montoUSD.toFixed(2)}` : "$0.00"}
        </div>
      </div>

      {/* Descripción */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[#fbf0df]/70">Descripción</label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => handleDescripcionChange(e.target.value)}
          placeholder="Mercado Central"
          className="bg-transparent border-2 border-[#fbf0df]/30 rounded-lg px-3 py-2 text-[#fbf0df] focus:border-[#f3d5a3] outline-none transition-colors"
        />
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[#fbf0df]/70">Categoría</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoria(key)}
              className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                categoria === key
                  ? "bg-[#fbf0df] text-[#1a1a1a]"
                  : "bg-[#242424] text-[#fbf0df] border-2 border-[#fbf0df]/30 hover:border-[#f3d5a3]"
              }`}
            >
              {CATEGORIES[key].label}
              <span className="block text-xs opacity-70">{CATEGORIES[key].pct}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botón enviar */}
      <button
        type="submit"
        disabled={!montoVESNum || !tasaNum || !categoria || submitting || disabled}
        className="bg-[#fbf0df] text-[#1a1a1a] font-bold py-3 px-6 rounded-lg transition-all hover:bg-[#f3d5a3] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Enviando..." : "Registrar Gasto"}
      </button>
    </form>
  );
}
