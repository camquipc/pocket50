import { CATEGORIES } from "./config";

type CategoryKey = keyof typeof CATEGORIES;

interface CategoryData {
  spent: number;
  limit: number;
  pct: number;
}

interface BudgetDashboardProps {
  summary: Record<string, CategoryData>;
  ingresoMensual: number;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 70) return "bg-orange-400";
  return "bg-green-500";
}

function getTextColor(pct: number): string {
  if (pct >= 100) return "text-red-400";
  if (pct >= 70) return "text-orange-400";
  return "text-green-400";
}

export function BudgetDashboard({ summary, ingresoMensual }: BudgetDashboardProps) {
  const cats = Object.keys(CATEGORIES) as CategoryKey[];

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#1a1a1a] rounded-xl border-2 border-[#fbf0df]">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#fbf0df]">Presupuesto Mensual</h2>
        <span className="text-sm text-[#fbf0df]/70">${ingresoMensual} USD</span>
      </div>

      <div className="flex flex-col gap-4">
        {cats.map((cat) => {
          const data = summary[cat] || { spent: 0, limit: 0, pct: 0 };
          const barWidth = Math.min(data.pct, 100);
          const barColor = getBarColor(data.pct);
          const textColor = getTextColor(data.pct);

          return (
            <div key={cat} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-[#fbf0df]">
                  {CATEGORIES[cat].label} ({CATEGORIES[cat].pct}%)
                </span>
                <span className={`font-mono font-bold ${textColor}`}>
                  ${data.spent.toFixed(2)} / ${data.limit.toFixed(2)}
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-3 bg-[#242424] rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="text-right">
                <span className={`text-xs font-mono ${textColor}`}>
                  {data.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
