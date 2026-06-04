import { useCallback, useEffect, useState } from "react";
import { fetchAPI, getErrorMessage } from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Clock, LogOut, ScanLine, Gift, Check, X, AlertCircle, RefreshCw, QrCode, FileClock, Ban, Eye, Ticket } from "lucide-react";
import QRScanner from "../components/QRScanner";
import RewardsCatalog from "../components/RewardsCatalog";
import UniversityLogo from "../components/UniversityLogo";

type UserProfile = {
  role: "ADMIN" | "STUDENT" | "TEACHER" | string;
  first_name: string;
  last_name: string;
  email: string;
  cedula?: string | null;
  carrera?: string | null;
  profile_picture_url?: string | null;
  points_balance?: number;
};

type AdminRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  evidence: string[];
  User: {
    first_name: string;
    last_name: string;
    email: string;
  };
  Action: {
    name: string;
    points_value: number;
  };
  DynamicQR?: {
    qr_code_hash: string;
    is_used: boolean;
  } | null;
};

type Redemption = {
  id: string;
  ticket_number: number;
  ticket_qr_base64: string;
  ticket_used_at: string | null;
  redeemed_at: string;
  Reward: {
    name: string;
    points_cost: number;
  };
  User?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    cedula?: string | null;
    carrera?: string | null;
    profile_picture_url?: string | null;
  };
  TicketValidator?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type TicketScanResult = {
  message: string;
  redemption: Redemption;
};

type MyRequest = {
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

function buildTemporaryPhoto(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .replace(/[^A-Z0-9]/g, "") || "EP";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
      <rect width="240" height="300" fill="#e8f0d9"/>
      <circle cx="120" cy="102" r="46" fill="#4d80a7" opacity="0.9"/>
      <path d="M48 248c8-54 42-86 72-86s64 32 72 86" fill="#244670" opacity="0.92"/>
      <rect x="22" y="22" width="196" height="256" rx="10" fill="none" stroke="#7c9743" stroke-width="6"/>
      <text x="120" y="116" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${initials}</text>
      <text x="120" y="272" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#244670">FOTO TEMPORAL</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isTicketScanResult(result: unknown): result is TicketScanResult {
  return typeof result === "object" && result !== null && "redemption" in result;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [ticketScanHistory, setTicketScanHistory] = useState<Redemption[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showScanner, setShowScanner] = useState(false);
  const [showTicketScanner, setShowTicketScanner] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Redemption | null>(null);
  const [lastTicketScan, setLastTicketScan] = useState<Redemption | null>(null);

  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userProfile = await fetchAPI<UserProfile>("/auth/profile");
      setProfile(userProfile);

      if (userProfile.role === "ADMIN") {
        const [requests, scannedTickets] = await Promise.all([
          fetchAPI<AdminRequest[]>("/actions/admin/requests"),
          fetchAPI<Redemption[]>("/rewards/tickets/scanned-history"),
        ]);
        setAdminRequests(requests);
        setTicketScanHistory(scannedTickets);
        setMyRequests([]);
        setHistory([]);
      } else if (userProfile.role === "TEACHER") {
        setAdminRequests([]);
        setTicketScanHistory([]);
        setMyRequests([]);
        setHistory([]);
      } else {
        const [redemptions, requests] = await Promise.all([
          fetchAPI<Redemption[]>("/rewards/history"),
          fetchAPI<MyRequest[]>("/actions/my-requests"),
        ]);
        setHistory(redemptions);
        setTicketScanHistory([]);
        setMyRequests(requests);
      }
    } catch (err: unknown) {
      console.error(err);
      const message = getErrorMessage(err, "Error al conectar con el servidor.");
      if (message.includes("Token") || message.includes("Acceso denegado") || message.includes("jwt")) {
        navigate("/");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const handleLogout = async () => {
    try {
      await fetchAPI("/auth/logout", { method: "POST" });
    } catch {
      // The local session can still be cleared even if the server is unavailable.
    }

    localStorage.removeItem("token");
    navigate("/");
  };

  const handleReviewRequest = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await fetchAPI("/actions/admin/approve", {
        method: "POST",
        body: JSON.stringify({ request_id: requestId, status })
      });
      loadData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Error al procesar la solicitud."));
    }
  };

  const handleTicketScanSuccess = useCallback((result?: unknown) => {
    if (isTicketScanResult(result)) {
      setLastTicketScan(result.redemption);
      setTicketScanHistory((current) => [
        result.redemption,
        ...current.filter((item) => item.id !== result.redemption.id),
      ]);
    }
  }, []);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Estudiante";
  const ticketStudentName = selectedTicket
    ? [selectedTicket.User?.first_name ?? profile?.first_name, selectedTicket.User?.last_name ?? profile?.last_name].filter(Boolean).join(" ") || selectedTicket.User?.email || fullName
    : fullName;
  const ticketCareer = selectedTicket?.User?.carrera || profile?.carrera || "Carrera no registrada";
  const ticketCedula = selectedTicket?.User?.cedula || profile?.cedula || "Cédula no registrada";
  const ticketPhoto = selectedTicket?.User?.profile_picture_url || profile?.profile_picture_url || buildTemporaryPhoto(ticketStudentName);
  const lastTicketStudentName = lastTicketScan
    ? [lastTicketScan.User?.first_name, lastTicketScan.User?.last_name].filter(Boolean).join(" ") || lastTicketScan.User?.email || "Estudiante"
    : "";
  const lastTicketCareer = lastTicketScan?.User?.carrera || "Carrera no registrada";
  const lastTicketCedula = lastTicketScan?.User?.cedula || "Cédula no registrada";
  const lastTicketValidatorName = lastTicketScan
    ? [lastTicketScan.TicketValidator?.first_name, lastTicketScan.TicketValidator?.last_name].filter(Boolean).join(" ") || lastTicketScan.TicketValidator?.email || fullName
    : "";

  if (loading && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-beige">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-carolina animate-spin" />
          <p className="text-delft/60 font-medium text-sm">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // --- ADMIN DASHBOARD ---
  if (profile?.role === "ADMIN") {
    return (
      <div className="min-h-screen bg-beige text-delft font-sans">
        {/* Enterprise Top Navbar */}
        <header className="bg-delft text-white border-b border-carolina/30 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <UniversityLogo className="max-h-9 brightness-0 invert" />
                <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-carolina sm:block">Panel de Administración</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end mr-4">
                  <span className="text-sm font-semibold text-white">{fullName}</span>
                  <span className="text-xs text-carolina">Administrador</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/80 hover:text-white font-medium transition-colors border border-carolina/50 px-3 py-1.5 rounded-md hover:bg-white/10">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-md flex justify-between items-center">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={loadData} className="text-sm text-red-700 font-semibold hover:underline">Reintentar</button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white border border-carolina/40 rounded-lg p-8 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-medium text-delft/60 mb-2">Solicitudes Pendientes</h3>
              <p className="text-4xl font-bold text-delft">{adminRequests.filter(r => r.status === 'PENDING').length}</p>
            </div>
            <div className="bg-white border border-carolina/40 rounded-lg p-8 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-medium text-delft/60 mb-2">Solicitudes Aprobadas</h3>
              <p className="text-4xl font-bold text-fern">{adminRequests.filter(r => r.status === 'APPROVED').length}</p>
            </div>
            <div className="bg-white border border-carolina/40 rounded-lg p-8 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <h3 className="text-sm font-medium text-delft/60 mb-2">Solicitudes Rechazadas</h3>
              <p className="text-4xl font-bold text-red-600">{adminRequests.filter(r => r.status === 'REJECTED').length}</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-lg border border-carolina/40 bg-white shadow-sm animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="border-b border-carolina/40 bg-delft px-6 py-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <Ticket className="h-5 w-5 text-carolina" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Validación presencial</p>
                    <h2 className="text-xl font-bold">Tickets de Descuento</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowTicketScanner(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-carolina/50 bg-carolina/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-carolina/30 focus:outline-none focus:ring-2 focus:ring-carolina"
                >
                  <ScanLine className="h-4 w-4" />
                  Abrir scanner
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
              <div className="p-6 lg:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-carolina/20 text-delft">
                    <ScanLine className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-delft">Scanner administrativo</h3>
                    <p className="mt-2 text-sm leading-6 text-delft/60">
                      El administrador puede validar tickets canjeados y dejarlos marcados como usados en auditoría.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="border-t border-carolina/40 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Tipo de QR</p>
                    <p className="mt-1 font-bold text-delft">Ticket de canje</p>
                  </div>
                  <div className="border-t border-carolina/40 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Resultado</p>
                    <p className="mt-1 font-bold text-delft">{lastTicketScan ? "Validado" : "Esperando lectura"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-carolina/40 bg-carolina/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
                {lastTicketScan ? (
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <img
                      src={lastTicketScan.User?.profile_picture_url || buildTemporaryPhoto(lastTicketStudentName)}
                      alt={`Foto de ${lastTicketStudentName}`}
                      className="h-32 w-24 shrink-0 rounded-md border border-carolina/50 object-cover bg-white"
                    />
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-delft px-3 py-1 text-sm font-bold text-white">
                          Ticket #{lastTicketScan.ticket_number}
                        </span>
                        <span className="rounded-md border border-pistachio bg-pistachio/30 px-3 py-1 text-xs font-semibold text-fern">
                          Usado
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-delft">{lastTicketScan.Reward.name}</h3>
                      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-delft/60">Estudiante</dt>
                          <dd className="font-semibold text-delft">{lastTicketStudentName}</dd>
                        </div>
                        <div>
                          <dt className="text-delft/60">Cédula</dt>
                          <dd className="font-semibold text-delft">{lastTicketCedula}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-delft/60">Carrera</dt>
                          <dd className="font-semibold text-delft">{lastTicketCareer}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-delft/60">Validado por</dt>
                          <dd className="font-semibold text-delft">{lastTicketValidatorName}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center text-center text-delft/60">
                    <Ticket className="mb-3 h-10 w-10 text-carolina" />
                    <p className="text-sm font-medium">No hay tickets validados en esta sesión.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-carolina/40 bg-white shadow-sm animate-slide-up" style={{ animationDelay: '0.18s' }}>
            <div className="flex flex-col gap-3 border-b border-carolina/40 bg-beige/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-lg text-delft">Historial de QR Escaneados</h2>
                <p className="text-sm text-delft/60">Auditoría de tickets de descuento validados presencialmente.</p>
              </div>
              <button onClick={loadData} className="inline-flex items-center gap-2 rounded-md border border-carolina/50 bg-white px-3 py-2 text-sm font-semibold text-delft transition hover:bg-carolina/10">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>

            {ticketScanHistory.length === 0 ? (
              <div className="p-10 text-center text-delft/60">
                <QrCode className="mx-auto mb-3 h-10 w-10 text-carolina" />
                <p className="text-sm font-medium">Aún no hay tickets escaneados para auditoría.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-carolina/15 text-delft/70">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Fecha / Hora</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Ticket</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Estudiante</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Descuento</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Validado por</th>
                      <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {ticketScanHistory.map((ticket) => {
                      const studentName = [ticket.User?.first_name, ticket.User?.last_name].filter(Boolean).join(" ") || ticket.User?.email || "Estudiante";
                      const validatorName = [ticket.TicketValidator?.first_name, ticket.TicketValidator?.last_name].filter(Boolean).join(" ") || ticket.TicketValidator?.email || "Sin registro";

                      return (
                        <tr key={ticket.id} className="transition-colors hover:bg-beige/70">
                          <td className="px-6 py-4 whitespace-nowrap text-delft/70">
                            {ticket.ticket_used_at ? new Date(ticket.ticket_used_at).toLocaleString() : "Sin fecha"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="rounded-md bg-delft px-2.5 py-1 text-xs font-bold text-white">
                              #{ticket.ticket_number}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-delft">{studentName}</div>
                            <div className="text-xs text-delft/60">{ticket.User?.cedula || "Cédula no registrada"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-delft">{ticket.Reward.name}</div>
                            <div className="text-xs text-delft/60">{ticket.Reward.points_cost} pts canjeados</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-delft">{validatorName}</div>
                            <div className="text-xs text-delft/60">{ticket.TicketValidator?.role || "Validador"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded border border-pistachio bg-pistachio/30 px-2 py-1 text-xs font-semibold text-fern">
                              QR usado
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Table */}
          <div className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="px-8 py-5 border-b border-carolina/40 bg-beige/50 flex justify-between items-center">
              <h2 className="font-semibold text-lg text-delft">Bandeja de Revisión</h2>
              <button onClick={loadData} className="text-delft/60 hover:text-delft p-1"><RefreshCw className="w-4 h-4" /></button>
            </div>
            
            {adminRequests.filter(r => r.status === 'PENDING').length === 0 ? (
              <div className="p-12 text-center text-delft/60">
                <Check className="w-8 h-8 mx-auto mb-3 text-carolina/70" />
                <p className="text-sm font-medium">No hay solicitudes pendientes de revisión.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-beige text-delft/60">
                    <tr>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Fecha</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Usuario</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Acción / Puntos</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Evidencia</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs text-right">Opciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {adminRequests.filter(r => r.status === 'PENDING').map(req => (
                      <tr key={req.id} className="hover:bg-beige transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-delft/60">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-delft">{req.User.first_name} {req.User.last_name}</div>
                          <div className="text-delft/60 text-xs">{req.User.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-delft">{req.Action.name}</div>
                          <div className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-pistachio/60 text-fern">
                            +{req.Action.points_value} pts
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {Array.isArray(req.evidence) && req.evidence.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded border border-carolina/40 overflow-hidden hover:opacity-80 transition-opacity">
                                {url.includes('.mp4') ? (
                                  <div className="w-full h-full bg-carolina/20 flex items-center justify-center text-[10px] font-bold text-carolina">VID</div>
                                ) : (
                                  <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                                )}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleReviewRequest(req.id, "REJECTED")} className="px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors">
                              Rechazar
                            </button>
                            <button onClick={() => handleReviewRequest(req.id, "APPROVED")} className="px-3 py-1.5 text-xs text-white bg-delft hover:bg-delft/90 rounded transition-colors">
                              Aprobar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <section className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="px-8 py-5 border-b border-carolina/40 bg-delft text-white flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg">Historial de Solicitudes</h2>
                <p className="text-sm text-carolina">Auditoría de solicitudes aprobadas, rechazadas y pendientes.</p>
              </div>
              <button onClick={loadData} className="text-carolina hover:text-white p-1" aria-label="Actualizar auditoría">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {adminRequests.length === 0 ? (
              <div className="p-12 text-center text-delft/60">
                <FileClock className="w-8 h-8 mx-auto mb-3 text-carolina/70" />
                <p className="text-sm font-medium">No hay solicitudes registradas para auditoría.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-carolina/15 text-delft/70">
                    <tr>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Fecha</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Estudiante</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Acción</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Estado</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">QR</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Evidencias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {adminRequests.map((req) => {
                      const statusClass =
                        req.status === "PENDING"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : req.status === "REJECTED"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-pistachio/50 text-fern border-pistachio";
                      const statusLabel =
                        req.status === "PENDING"
                          ? "Pendiente"
                          : req.status === "REJECTED"
                            ? "Rechazada"
                            : "Aprobada";
                      const qrLabel = !req.DynamicQR
                        ? "Sin QR"
                        : req.DynamicQR.is_used
                          ? "Usado"
                          : "Activo";

                      return (
                        <tr key={req.id} className="hover:bg-beige/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-delft/60">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-delft">{req.User.first_name} {req.User.last_name}</div>
                            <div className="text-xs text-delft/60">{req.User.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-delft">{req.Action.name}</div>
                            <div className="text-xs text-fern">+{req.Action.points_value} pts</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded border border-carolina/40 bg-carolina/15 px-2 py-1 text-xs font-semibold text-delft/70">
                              {qrLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {Array.isArray(req.evidence) && req.evidence.length > 0 ? (
                                req.evidence.map((url: string, i: number) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-10 h-10 rounded border border-carolina/40 overflow-hidden hover:opacity-80 transition-opacity">
                                    {url.includes('.mp4') ? (
                                      <div className="w-full h-full bg-carolina/20 flex items-center justify-center text-[10px] font-bold text-carolina">VID</div>
                                    ) : (
                                      <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                                    )}
                                  </a>
                                ))
                              ) : (
                                <span className="text-xs text-delft/50">Sin evidencia</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {showTicketScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-delft/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-carolina/40 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-carolina/40 bg-delft px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-carolina/20">
                    <ScanLine className="h-5 w-5 text-carolina" />
                  </span>
                  <div>
                    <h2 className="font-bold">Validar Ticket</h2>
                    <p className="text-sm text-carolina">Scanner administrativo de QR de canje.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTicketScanner(false)}
                  className="rounded-md p-1 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-carolina"
                  aria-label="Cerrar scanner de tickets"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="p-6 lg:p-8">
                  <QRScanner
                    endpoint="/rewards/tickets/scan"
                    payloadKey="ticket_qr_hash"
                    successMessage="Ticket validado correctamente."
                    successTitle="Ticket Validado"
                    successDescription="El descuento quedó marcado como usado."
                    scannerLabel="Apunte al QR del ticket"
                    showAlert={false}
                    showSuccessWink={false}
                    onScanSuccess={handleTicketScanSuccess}
                  />
                </div>

                <aside className="border-t border-carolina/40 bg-beige/60 p-6 lg:border-l lg:border-t-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Resultado</p>
                  {lastTicketScan ? (
                    <div className="mt-4 space-y-5">
                      <div className="flex items-center gap-4">
                        <img
                          src={lastTicketScan.User?.profile_picture_url || buildTemporaryPhoto(lastTicketStudentName)}
                          alt={`Foto de ${lastTicketStudentName}`}
                          className="h-24 w-20 rounded-md border border-carolina/50 bg-white object-cover"
                        />
                        <div>
                          <p className="rounded-md bg-delft px-3 py-1 text-sm font-bold text-white">
                            Ticket #{lastTicketScan.ticket_number}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-fern">Validado</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-delft">{lastTicketScan.Reward.name}</h3>
                        <p className="mt-1 text-sm text-delft/60">
                          {lastTicketScan.ticket_used_at ? new Date(lastTicketScan.ticket_used_at).toLocaleString() : "Validado ahora"}
                        </p>
                      </div>

                      <dl className="grid gap-3 text-sm">
                        <div>
                          <dt className="font-semibold text-delft/60">Estudiante</dt>
                          <dd className="font-bold text-delft">{lastTicketStudentName}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-delft/60">Cédula</dt>
                          <dd className="font-bold text-delft">{lastTicketCedula}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-delft/60">Carrera</dt>
                          <dd className="font-bold text-delft">{lastTicketCareer}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-delft/60">Validado por</dt>
                          <dd className="font-bold text-delft">{lastTicketValidatorName}</dd>
                        </div>
                      </dl>
                    </div>
                  ) : (
                    <div className="mt-8 flex min-h-64 flex-col items-center justify-center text-center text-delft/60">
                      <QrCode className="mb-3 h-10 w-10 text-carolina" />
                      <p className="text-sm font-medium">Esperando lectura del ticket.</p>
                    </div>
                  )}
                </aside>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- TEACHER DASHBOARD ---
  if (profile?.role === "TEACHER") {
    return (
      <div className="min-h-screen bg-beige text-delft font-sans">
        <header className="bg-delft text-white border-b border-carolina/30 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <UniversityLogo className="max-h-9 brightness-0 invert" />
                <p className="hidden text-[10px] font-semibold uppercase tracking-wider text-carolina sm:block">Panel Docente</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end mr-4">
                  <span className="text-sm font-semibold text-white">{fullName}</span>
                  <span className="text-xs text-carolina">Docente</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/80 hover:text-white font-medium transition-colors border border-carolina/50 px-3 py-1.5 rounded-md hover:bg-white/10">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded-r-md flex justify-between items-center">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={loadData} className="text-sm text-red-700 font-semibold hover:underline">Reintentar</button>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden animate-slide-up">
              <div className="border-b border-carolina/40 bg-delft px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-carolina/20">
                    <ScanLine className="h-5 w-5 text-carolina" />
                  </span>
                  <div>
                    <h1 className="text-xl font-bold">Scanner de Tickets</h1>
                    <p className="text-sm text-carolina">Valida únicamente tickets de descuentos canjeados.</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <QRScanner
                  endpoint="/rewards/tickets/scan"
                  payloadKey="ticket_qr_hash"
                  successMessage="Ticket validado correctamente."
                  successTitle="Ticket Validado"
                  successDescription="El descuento quedó marcado como usado."
                  scannerLabel="Apunte al QR del ticket"
                  showSuccessWink={false}
                  onScanSuccess={handleTicketScanSuccess}
                />
              </div>
            </section>

            <section className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="border-b border-carolina/40 bg-beige/50 px-6 py-5">
                <h2 className="font-semibold text-lg text-delft">Último Ticket Validado</h2>
                <p className="text-sm text-delft/60">Resultado del escaneo más reciente.</p>
              </div>

              {lastTicketScan ? (
                <div className="p-6 space-y-5">
                  <div className="rounded-md border border-pistachio bg-pistachio/30 px-4 py-3 text-sm font-semibold text-fern">
                    Ticket #{lastTicketScan.ticket_number} marcado como usado
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Descuento</p>
                    <h3 className="mt-1 text-xl font-bold text-delft">{lastTicketScan.Reward.name}</h3>
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold text-delft/60">Estudiante</dt>
                      <dd className="mt-1 font-bold text-delft">{lastTicketStudentName}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-delft/60">Cédula</dt>
                      <dd className="mt-1 font-bold text-delft">{lastTicketCedula}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-delft/60">Carrera</dt>
                      <dd className="mt-1 font-bold text-delft">{lastTicketCareer}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-delft/60">Fecha de validación</dt>
                      <dd className="mt-1 font-bold text-delft">
                        {lastTicketScan.ticket_used_at ? new Date(lastTicketScan.ticket_used_at).toLocaleString() : "Ahora"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="p-10 text-center text-delft/60">
                  <Ticket className="mx-auto mb-3 h-10 w-10 text-carolina" />
                  <p className="text-sm font-medium">Aún no se ha validado un ticket.</p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  // --- STUDENT DASHBOARD ---
  return (
    <div className="min-h-screen bg-beige text-delft font-sans">
      {/* Enterprise Top Navbar */}
      <header className="bg-delft text-white border-b border-carolina/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <UniversityLogo className="max-h-9 brightness-0 invert" />
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-4">
                <span className="text-sm font-semibold text-white">{fullName}</span>
                <span className="text-xs text-carolina font-medium">Estudiante</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-white/80 hover:text-white font-medium transition-colors border border-carolina/50 px-3 py-1.5 rounded-md hover:bg-white/10">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-md flex justify-between items-center">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={loadData} className="text-sm text-red-700 font-semibold hover:underline">Reintentar</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-8 animate-slide-up">
            
            {/* Header / Summary Card */}
            <div className="bg-white border border-delft/15 rounded-lg p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-delft mb-1">Resumen General</h2>
                <p className="text-delft/60 text-sm">Gestiona tus acciones y recompensas desde este panel.</p>
              </div>
              <div className="bg-delft border border-delft rounded-md px-6 py-4 text-center min-w-[150px] shadow-sm">
                <p className="text-xs font-semibold text-carolina uppercase tracking-wider mb-1">Puntos</p>
                <p className="text-4xl font-bold text-white">{profile?.points_balance || 0}</p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-semibold text-delft border-b border-carolina/40 pb-3 mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <button 
                  onClick={() => setShowScanner(true)}
                  className="bg-carolina/15 border border-carolina/50 rounded-xl p-6 shadow-sm text-left flex flex-col gap-4 hover:-translate-y-1 hover:shadow-md hover:border-carolina transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-delft"
                >
                <div className="w-10 h-10 bg-carolina/20 rounded flex items-center justify-center border border-carolina/40">
                  <ScanLine className="w-5 h-5 text-delft/80" />
                </div>
                <div>
                  <h4 className="font-semibold text-delft">Escanear QR</h4>
                  <p className="text-delft/60 text-xs mt-1 leading-relaxed">Escanea el QR aprobado cuando lo tengas disponible.</p>
                </div>
              </button>

              <Link 
                to="/request"
                className="bg-pistachio/20 border border-pistachio/70 rounded-xl p-6 shadow-sm text-left flex flex-col gap-4 hover:-translate-y-1 hover:shadow-md hover:border-pistachio transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-delft group"
              >
                <div className="w-12 h-12 bg-carolina/20 rounded-lg flex items-center justify-center border border-carolina/40 group-hover:bg-carolina/20 transition-colors">
                  <Plus className="w-6 h-6 text-delft/80 group-hover:text-delft transition-colors" />
                </div>
                <div>
                  <h4 className="font-semibold text-delft">Subir Evidencia</h4>
                  <p className="text-delft/60 text-xs mt-1 leading-relaxed">Carga fotos o videos de tus proyectos.</p>
                </div>
              </Link>

              <button 
                onClick={() => setShowCatalog(true)}
                className="bg-delft border border-delft rounded-xl p-6 shadow-md text-left flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg hover:bg-delft/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-delft focus:ring-offset-2"
              >
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Recompensas</h4>
                  <p className="text-carolina/70 text-xs mt-1 leading-relaxed">Canjea tus puntos acumulados.</p>
                </div>
              </button>
            </div>
            </div>

            <section className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-carolina/40 bg-beige/50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-delft">Mis Solicitudes</h3>
                  <p className="text-sm text-delft/60">Revisa tus solicitudes pendientes y los QR aprobados.</p>
                </div>
                <button onClick={loadData} className="text-delft/60 hover:text-delft p-1" aria-label="Actualizar solicitudes">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {myRequests.length === 0 ? (
                <div className="p-8 text-center text-delft/60">
                  <FileClock className="w-8 h-8 mx-auto mb-3 text-carolina" />
                  <p className="text-sm font-medium">Todavía no tienes solicitudes registradas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {myRequests.map((request) => {
                    const used = request.DynamicQR?.is_used;
                    const approved = request.status === "APPROVED";
                    const pending = request.status === "PENDING";
                    const rejected = request.status === "REJECTED";
                    const statusLabel = pending
                      ? "Pendiente de aprobación"
                      : rejected
                        ? "Rechazada"
                        : used
                          ? "QR usado"
                          : "QR activo";
                    const statusClass = pending
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : rejected
                        ? "bg-red-50 text-red-700 border-red-200"
                        : used
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-pistachio/50 text-fern border-pistachio";

                    return (
                      <article key={request.id} className="rounded-lg border border-carolina/40 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className={`font-semibold text-delft ${used ? "line-through decoration-2 decoration-red-500" : ""}`}>
                              {request.Action.name}
                            </h4>
                            <p className="mt-1 text-xs text-delft/60">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                          {approved && request.qr_code_base64 ? (
                            <div className={`relative h-28 w-28 shrink-0 overflow-hidden rounded-md border border-carolina/40 bg-white ${used ? "opacity-60 grayscale" : ""}`}>
                              {used ? (
                                <img src={request.qr_code_base64} alt={`QR de ${request.Action.name}`} className="h-full w-full object-cover" />
                              ) : (
                                <Link
                                  to={`/qr/${request.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block h-full w-full focus:outline-none focus:ring-2 focus:ring-delft focus:ring-offset-2"
                                  aria-label={`Abrir QR de ${request.Action.name}`}
                                >
                                  <img src={request.qr_code_base64} alt={`QR de ${request.Action.name}`} className="h-full w-full object-cover" />
                                </Link>
                              )}
                              {used && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="absolute h-[150%] w-1 rotate-45 bg-red-600" />
                                  <span className="rounded bg-white/90 px-2 py-1 text-xs font-bold text-red-700 shadow-sm">
                                    Usado
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-carolina/60 bg-beige/60 text-delft/50">
                              {rejected ? <Ban className="w-7 h-7" /> : <QrCode className="w-7 h-7" />}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-delft">+{request.Action.points_value} pts</p>
                            <p className="mt-1 text-xs leading-5 text-delft/60">
                              {pending
                                ? "Tu evidencia está esperando revisión administrativa."
                                : rejected
                                  ? "La solicitud fue rechazada. Puedes enviar una nueva evidencia."
                                  : used
                                    ? "Este QR ya fue escaneado y no puede volver a utilizarse."
                                    : "Presenta este QR para registrar tus puntos."}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar (1/3 width on desktop) */}
          <div className="lg:col-span-1 space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white border border-carolina/40 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-carolina/40 bg-beige/50 flex items-center justify-between">
                <h3 className="font-semibold text-delft">Descuentos Canjeados</h3>
                <Clock className="w-4 h-4 text-carolina" />
              </div>
              
              <div className="flex-1 p-0 overflow-y-auto max-h-[400px]">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-delft/60">
                    <p className="text-sm">No hay descuentos canjeados.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {history.map((item) => (
                      <li key={item.id} className="px-6 py-4 hover:bg-beige transition-colors">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <h4 className="font-medium text-sm text-delft">{item.Reward.name}</h4>
                            <p className="text-xs text-delft/60 mt-1">{new Date(item.redeemed_at).toLocaleDateString()}</p>
                            <p className="mt-1 text-xs font-semibold text-delft">Ticket #{item.ticket_number}</p>
                            <p className={`mt-1 text-xs font-semibold ${item.ticket_used_at ? "text-red-600" : "text-fern"}`}>
                              {item.ticket_used_at ? "Ticket usado" : "Ticket activo"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => setSelectedTicket(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-carolina/50 bg-white text-delft transition hover:bg-carolina/15 focus:outline-none focus:ring-2 focus:ring-delft"
                              aria-label={`Ver ticket ${item.ticket_number}`}
                              title="Ver ticket"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-carolina/20 text-delft/90 border border-carolina/40">
                              -{item.Reward.points_cost} pts
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* Enterprise Modals */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-delft/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-carolina/40 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-carolina/40 bg-beige">
              <h2 className="font-bold text-delft">Escáner de Código QR</h2>
              <button onClick={() => setShowScanner(false)} className="text-carolina hover:text-delft p-1 rounded-md hover:bg-carolina/40 transition-colors focus:outline-none focus:ring-2 focus:ring-delft">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <QRScanner onScanSuccess={loadData} />
            </div>
          </div>
        </div>
      )}

      {showCatalog && (
        <div className="fixed inset-0 z-50 flex flex-col bg-beige sm:p-6 lg:p-12 overflow-y-auto">
          <div className="bg-white w-full max-w-7xl mx-auto sm:rounded-xl shadow-xl flex flex-col flex-1 border border-carolina/40 min-h-full">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-carolina/40 bg-white sticky top-0 z-20 rounded-t-xl">
              <div>
                <h2 className="font-bold text-xl text-delft">Catálogo de Recompensas</h2>
                <p className="text-sm text-delft/60">Saldo disponible: <span className="font-bold text-delft">{profile?.points_balance || 0} pts</span></p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="flex items-center gap-2 px-4 py-2 border border-carolina/60 rounded-md text-sm font-medium text-delft/80 bg-white hover:bg-beige transition-colors focus:outline-none focus:ring-2 focus:ring-delft">
                Cerrar <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 sm:p-8 flex-1 bg-beige/50">
              <RewardsCatalog userBalance={profile?.points_balance || 0} onRedeemSuccess={loadData} />
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-delft/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-carolina/40 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-carolina/40 bg-delft px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-carolina/20">
                  <Ticket className="h-5 w-5 text-carolina" />
                </span>
                <div>
                  <h2 className="font-bold">Ticket de Canje</h2>
                  <p className="text-sm text-carolina">Nro. #{selectedTicket.ticket_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-md p-1 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-carolina"
                aria-label="Cerrar ticket"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-beige/60 p-5 sm:p-6">
              <div className="rounded-lg border border-dashed border-carolina/70 bg-white p-5">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="shrink-0 space-y-4">
                    <img
                      src={ticketPhoto}
                      alt={`Foto de ${ticketStudentName}`}
                      className="h-[180px] w-[144px] rounded-md border border-carolina/50 object-cover shadow-sm"
                    />
                    <div className="relative w-[144px] rounded-md border border-carolina/50 bg-white p-2 shadow-sm">
                      <img
                        src={selectedTicket.ticket_qr_base64}
                        alt={`QR del ticket ${selectedTicket.ticket_number}`}
                        className={`h-32 w-32 object-contain ${selectedTicket.ticket_used_at ? "opacity-45 grayscale" : ""}`}
                      />
                      {selectedTicket.ticket_used_at && (
                        <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded bg-white/90 px-2 py-1 text-center text-xs font-bold text-red-700 shadow-sm">
                          Usado
                        </span>
                      )}
                      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-delft/60">QR docente</p>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-col gap-2 border-b border-carolina/30 pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-carolina">Descuento canjeado</p>
                        <h3 className="mt-1 text-xl font-bold text-delft">{selectedTicket.Reward.name}</h3>
                      </div>
                      <span className="w-fit rounded-md bg-delft px-3 py-1.5 text-sm font-bold text-white">
                        #{selectedTicket.ticket_number}
                      </span>
                    </div>

                    <div className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${
                      selectedTicket.ticket_used_at
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-pistachio bg-pistachio/30 text-fern"
                    }`}>
                      {selectedTicket.ticket_used_at ? "Este ticket ya fue usado" : "Ticket listo para validación docente"}
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-delft/60">Estudiante</dt>
                        <dd className="mt-1 font-bold text-delft">{ticketStudentName}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-delft/60">Cédula</dt>
                        <dd className="mt-1 font-bold text-delft">{ticketCedula}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-delft/60">Carrera</dt>
                        <dd className="mt-1 font-bold text-delft">{ticketCareer}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-delft/60">Fecha de canje</dt>
                        <dd className="mt-1 font-bold text-delft">{new Date(selectedTicket.redeemed_at).toLocaleDateString()}</dd>
                      </div>
                    </dl>

                    <div className="mt-5 rounded-md border border-carolina/40 bg-carolina/15 px-4 py-3 text-sm leading-6 text-delft/80">
                      Presenta este ticket en el punto de atención para reclamar tu descuento.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
