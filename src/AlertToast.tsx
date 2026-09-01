import { useEffect } from "react";

interface Alert {
  category: string;
  label: string;
  spent: number;
  limit: number;
  over: number;
  message: string;
}

interface AlertToastProps {
  alerts: Alert[];
  onDismiss: () => void;
}

export function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  // Auto-dismiss después de 5 segundos
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [alerts, onDismiss]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert) => (
        <div
          key={alert.category}
          className="bg-red-900/90 border-2 border-red-500 rounded-xl p-4 flex justify-between items-start animate-pulse"
        >
          <div className="flex flex-col gap-1">
            <span className="text-red-300 font-bold">Alerta de Presupuesto</span>
            <span className="text-white">{alert.message}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-red-300 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
