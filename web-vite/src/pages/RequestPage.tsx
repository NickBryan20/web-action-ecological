import { useCallback, useEffect, useState } from "react";
import { fetchAPI, getErrorMessage } from "../lib/api";
import { Link } from "react-router-dom";
import { UploadCloud, CheckCircle, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

type EcoAction = {
  id: string;
  name: string;
  points_value: number;
};

export default function RequestPage() {
  const [actions, setActions] = useState<EcoAction[]>([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  
  const [loadingActions, setLoadingActions] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    setActionError(null);
    try {
      const data = await fetchAPI<EcoAction[]>("/actions/list");
      setActions(data);
    } catch (err: unknown) {
      console.error(err);
      setActionError(getErrorMessage(err, "No se pudieron cargar las acciones ecológicas. Verifique su conexión o intente más tarde."));
    } finally {
      setLoadingActions(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadActions);
  }, [loadActions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction || files.length === 0) {
      setSubmitError("Debe seleccionar una acción y adjuntar al menos una evidencia.");
      return;
    }

    setLoadingSubmit(true);
    setSubmitError(null);

    try {
      const evidence = await Promise.all(files.map(fileToBase64));

      await fetchAPI("/actions/request", {
        method: "POST",
        body: JSON.stringify({ action_id: selectedAction, evidence }),
      });

      setSuccess(true);
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, "Ocurrió un error inesperado al enviar la solicitud."));
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-beige">
        <div className="bg-white rounded-lg border border-carolina/40 shadow-sm p-10 max-w-lg w-full text-center">
          <div className="mx-auto w-16 h-16 bg-pistachio/60 text-fern rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-delft mb-2">Solicitud Enviada</h2>
          <p className="text-delft/60 mb-8">
            Su evidencia ha sido remitida al departamento de revisión. Los puntos serán asignados una vez aprobada la solicitud.
          </p>
          <Link to="/dashboard" className="inline-flex justify-center w-full bg-delft hover:bg-delft/90 text-white font-medium py-2.5 px-4 rounded-md transition-colors">
            Volver al Inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-beige py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-delft/60 hover:text-delft mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver
        </Link>

        <div className="bg-white rounded-lg border border-carolina/40 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-carolina/40">
            <h1 className="text-xl font-bold text-delft">Nueva Solicitud de Evidencia</h1>
            <p className="text-sm text-delft/60 mt-1">Complete el formulario para registrar su acción ecológica.</p>
          </div>

          <div className="p-6">
            {submitError && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Action Selection */}
              <div>
                <label className="block text-sm font-medium text-delft mb-2">
                  1. Acción Ecológica
                </label>
                
                {loadingActions ? (
                  <div className="flex items-center gap-2 text-delft/60 text-sm p-3 border border-carolina/40 rounded-md bg-beige">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Cargando catálogo de acciones...
                  </div>
                ) : actionError ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-800 mb-3">{actionError}</p>
                    <button type="button" onClick={loadActions} className="text-sm font-medium text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded transition-colors">
                      Reintentar conexión
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedAction}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-carolina/60 border focus:outline-none focus:ring-delft focus:border-delft sm:text-sm rounded-md"
                    required
                  >
                    <option value="" disabled>-- Seleccione una acción --</option>
                    {actions.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.name} (+{action.points_value} pts)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-delft mb-2">
                  2. Archivos Adjuntos (Evidencia)
                </label>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-carolina/60 border-dashed rounded-md hover:bg-beige transition-colors relative">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-carolina" />
                    <div className="flex text-sm text-delft/70 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-delft hover:text-delft/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-delft">
                        <span>Cargar archivos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">o arrastre y suelte aquí</p>
                    </div>
                    <p className="text-xs text-delft/60">
                      PNG, JPG, MP4 hasta 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                
                {files.length > 0 && (
                  <ul className="mt-4 border border-carolina/40 rounded-md divide-y divide-slate-200">
                    {files.map((file, idx) => (
                      <li key={idx} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="w-0 flex-1 flex items-center">
                          {file.type.startsWith('video') ? '🎥' : '📷'}
                          <span className="ml-2 flex-1 w-0 truncate text-delft">
                            {file.name}
                          </span>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="font-medium text-red-600 hover:text-red-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end border-t border-carolina/40">
                <button
                  type="submit"
                  disabled={loadingSubmit || loadingActions || !!actionError}
                  className="bg-delft border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-delft/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-delft disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingSubmit ? "Procesando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
