import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, QrCode, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { fetchAPI, getErrorMessage } from "../lib/api";
import UniversityLogo from "../components/UniversityLogo";

type RequestWithQR = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  qr_code_base64: string | null;
  Action: {
    name: string;
    points_value: number;
  };
  DynamicQR: {
    qr_code_hash: string;
    is_used: boolean;
  } | null;
};

export default function QRPage() {
  const { requestId } = useParams();
  const [request, setRequest] = useState<RequestWithQR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requests = await fetchAPI<RequestWithQR[]>("/actions/my-requests");
      const currentRequest = requests.find((item) => item.id === requestId) ?? null;

      if (!currentRequest) {
        setError("No se encontró el QR solicitado.");
      }

      setRequest(currentRequest);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "No se pudo cargar el QR."));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void Promise.resolve().then(loadRequest);
  }, [loadRequest]);

  const isUsableQr = request?.status === "APPROVED" && request.qr_code_base64 && !request.DynamicQR?.is_used;

  return (
    <main className="min-h-screen bg-beige px-4 py-8 text-delft sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-carolina/50 bg-white px-3 py-2 text-sm font-semibold text-delft transition hover:bg-carolina/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <UniversityLogo className="max-h-9" />
        </div>

        <section className="overflow-hidden rounded-lg border border-carolina/40 bg-white shadow-sm">
          <div className="border-b border-carolina/40 bg-delft px-6 py-5 text-white">
            <p className="text-sm font-semibold text-carolina">Código QR aprobado</p>
            <h1 className="mt-1 text-2xl font-bold">{request?.Action.name || "Solicitud"}</h1>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-delft/60">
                <RefreshCw className="h-8 w-8 animate-spin text-carolina" />
                <p className="text-sm font-medium">Cargando QR...</p>
              </div>
            ) : error ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-carolina/60 bg-beige/60 p-8 text-center">
                <QrCode className="mb-3 h-10 w-10 text-carolina" />
                <p className="font-semibold text-delft">{error}</p>
                <button onClick={loadRequest} className="mt-4 rounded-md bg-delft px-4 py-2 text-sm font-semibold text-white">
                  Reintentar
                </button>
              </div>
            ) : isUsableQr ? (
              <div className="text-center">
                <div className="mx-auto w-full max-w-sm rounded-lg border border-carolina/40 bg-white p-4 shadow-sm">
                  <img src={request.qr_code_base64 || ""} alt={`QR de ${request.Action.name}`} className="mx-auto w-full" />
                </div>
                <p className="mt-5 text-sm leading-6 text-delft/70">
                  Presenta este QR para registrar tus puntos. Si actualizas esta página, el QR se vuelve a cargar desde tu historial.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-carolina/60 bg-beige/60 p-8 text-center">
                <QrCode className="mb-3 h-10 w-10 text-carolina" />
                <p className="font-semibold text-delft">Este QR ya no está disponible para uso.</p>
                <p className="mt-2 text-sm text-delft/60">Puede estar pendiente, rechazado o ya utilizado.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
