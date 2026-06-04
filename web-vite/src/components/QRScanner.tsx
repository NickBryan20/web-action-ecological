import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { fetchAPI, getErrorMessage } from "../lib/api";
import { AlertCircle, CheckCircle, RefreshCw, Scan } from "lucide-react";

type QRScannerProps = {
  endpoint?: string;
  payloadKey?: string;
  successMessage?: string;
  successTitle?: string;
  successDescription?: string;
  scannerLabel?: string;
  showAlert?: boolean;
  showSuccessWink?: boolean;
  onScanSuccess: (result?: unknown) => void;
};

export default function QRScanner({
  endpoint = "/actions/scan",
  payloadKey = "qr_code_hash",
  successMessage = "Acción registrada con éxito.",
  successTitle = "Escaneo Exitoso",
  successDescription = "La acción ecológica ha sido registrada.",
  scannerLabel = "Apunte al código QR",
  showAlert = true,
  showSuccessWink = true,
  onScanSuccess,
}: QRScannerProps) {
  const reactId = useId();
  const scannerElementId = `qr-reader-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [scanStatus, setScanStatus] = useState<"scanning" | "success" | "error">("scanning");
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        await scanner.stop().catch(console.error);
      }

      try {
        const result = await fetchAPI(endpoint, {
          method: "POST",
          body: JSON.stringify({ [payloadKey]: decodedText }),
        });

        setScanStatus("success");
        if (showAlert) alert(successMessage);
        onScanSuccess(result);
      } catch (err: unknown) {
        setScanStatus("error");
        setErrorMessage(getErrorMessage(err, "Error al registrar el código."));
      }
    },
    [endpoint, onScanSuccess, payloadKey, showAlert, successMessage],
  );

  const startCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    hasScannedRef.current = false;
    setErrorMessage("");
    setScanStatus("scanning");

    try {
      if (scanner.isScanning) {
        await scanner.stop().catch(console.error);
      }

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleDecoded,
        () => {},
      );
    } catch (err: unknown) {
      console.error("Error iniciando escáner:", err);
      setScanStatus("error");
      setErrorMessage("No se pudo iniciar la cámara. Verifique los permisos.");
    }
  }, [handleDecoded]);

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerElementId);
    scannerRef.current = scanner;
    const startTimer = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      hasScannedRef.current = true;
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [scannerElementId, startCamera]);

  return (
    <div className="w-full max-w-md mx-auto">
      {scanStatus === "success" && (
        <div className="relative overflow-hidden rounded-lg border border-pistachio bg-pistachio/30 p-8 text-center">
          {showSuccessWink && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
              <span className="animate-pop-out text-7xl drop-shadow-xl">😉</span>
            </div>
          )}
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-fern" />
          <h3 className="mb-2 text-xl font-bold text-delft">{successTitle}</h3>
          <p className="text-sm text-delft/70">{successDescription}</p>
          <button
            onClick={startCamera}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-delft px-4 py-2 text-sm font-semibold text-white transition hover:bg-delft/90 focus:outline-none focus:ring-2 focus:ring-delft focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Escanear otro
          </button>
        </div>
      )}

      {scanStatus === "error" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-600" />
          <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          <button
            onClick={startCamera}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      )}

      <div className={`relative overflow-hidden rounded-lg border border-carolina/40 bg-delft ${scanStatus !== "scanning" ? "hidden" : "block"}`}>
        <div id={scannerElementId} className="w-full" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center border-[40px] border-black/40">
          <div className="h-[250px] w-[250px] rounded-lg border-2 border-fern shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>
        <div className="absolute inset-x-0 bottom-4 z-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-delft/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Scan className="h-4 w-4" />
            {scannerLabel}
          </span>
        </div>
      </div>
      <style>{`
        #${scannerElementId} video { object-fit: cover !important; }
        #${scannerElementId} { border: none !important; }
      `}</style>
    </div>
  );
}
