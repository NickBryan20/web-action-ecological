import { useCallback, useEffect, useState } from "react";
import { fetchAPI, getErrorMessage } from "../lib/api";
import { AlertCircle, RefreshCw, ShoppingBag } from "lucide-react";

type Reward = {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  stock: number;
};

export default function RewardsCatalog({
  userBalance,
  onRedeemSuccess,
}: {
  userBalance: number;
  onRedeemSuccess: () => void;
}) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI<Reward[]>("/rewards");
      setRewards(data);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "No se pudo cargar el catálogo de recompensas."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRewards);
  }, [loadRewards]);

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (userBalance < cost) {
      setError("Fondos insuficientes para esta recompensa.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!confirm("¿Confirma el canje de esta recompensa?")) return;

    setRedeemingId(rewardId);
    setError(null);

    try {
      await fetchAPI("/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ reward_id: rewardId }),
      });
      alert("Canje procesado exitosamente. Puedes abrir el ticket desde Descuentos Canjeados.");
      onRedeemSuccess();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al procesar el canje."));
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-carolina" />
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-delft">
            <ShoppingBag className="h-5 w-5 text-delft/60" />
            Catálogo disponible
          </h2>
          <p className="mt-1 text-sm text-delft/60">
            Seleccione una recompensa para canjear con sus puntos.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-r-md border-l-4 border-red-600 bg-red-50 p-4">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={loadRewards} className="text-sm font-semibold text-red-700 hover:underline">
            Reintentar
          </button>
        </div>
      )}

      {rewards.length === 0 && !error ? (
        <div className="rounded-lg border border-carolina/40 bg-white p-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-carolina/70" />
          <p className="text-sm font-medium text-delft/60">
            No hay recompensas disponibles en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex flex-col rounded-lg border border-carolina/40 bg-white transition-colors hover:border-carolina/60"
            >
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="pr-2 font-semibold leading-tight text-delft">{reward.name}</h3>
                  <span className="inline-flex shrink-0 items-center rounded border border-carolina/40 bg-carolina/20 px-2 py-0.5 text-xs font-medium text-delft/70">
                    Stock: {reward.stock}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 flex-1 text-sm text-delft/60">{reward.description}</p>

                <div className="mt-auto flex items-end gap-1">
                  <span className="text-2xl font-bold text-delft">{reward.points_cost}</span>
                  <span className="mb-1 text-xs font-medium text-delft/60">pts</span>
                </div>
              </div>
              <div className="rounded-b-lg border-t border-carolina/20 bg-beige p-4">
                <button
                  onClick={() => handleRedeem(reward.id, reward.points_cost)}
                  disabled={redeemingId === reward.id || reward.stock <= 0 || userBalance < reward.points_cost}
                  className={`flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    reward.stock <= 0
                      ? "cursor-not-allowed bg-carolina/40 text-delft/60"
                      : userBalance < reward.points_cost
                        ? "cursor-not-allowed border border-carolina/40 bg-white text-carolina"
                        : "bg-delft text-white hover:bg-delft/90 focus:outline-none focus:ring-2 focus:ring-delft focus:ring-offset-1"
                  }`}
                >
                  {redeemingId === reward.id
                    ? "Procesando..."
                    : reward.stock <= 0
                      ? "Agotado"
                      : userBalance < reward.points_cost
                        ? "Fondos insuficientes"
                        : "Canjear puntos"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
