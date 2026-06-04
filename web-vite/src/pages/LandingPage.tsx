import { useState } from "react";
import { fetchAPI, getErrorMessage } from "../lib/api";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  LineChart,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import UniversityLogo from "../components/UniversityLogo";

const platformHighlights = [
  {
    icon: QrCode,
    title: "Validación QR",
    copy: "Registra acciones verificadas en campus sin procesos manuales.",
  },
  {
    icon: LineChart,
    title: "Puntos visibles",
    copy: "Consulta avances, solicitudes y recompensas desde un solo panel.",
  },
  {
    icon: ShieldCheck,
    title: "Revisión segura",
    copy: "Los administradores aprueban evidencias con trazabilidad clara.",
  },
];

type LoginResponse = {
  message: string;
};

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await fetchAPI<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.removeItem("token");
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-950">
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]">
        <section className="relative order-2 flex min-h-[560px] overflow-hidden bg-fern px-6 py-8 text-white sm:px-10 lg:order-1 lg:min-h-screen lg:px-14 xl:px-20">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(29,42,98,0.97),rgba(36,70,112,0.94)_52%,rgba(77,128,167,0.9))]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,rgba(18,30,69,0.42),transparent)]" />

          <div className="relative z-10 flex w-full flex-col justify-between gap-12">
            <div className="flex items-center justify-between gap-4">
              <UniversityLogo className="max-h-11 brightness-0 invert drop-shadow-sm" />
              <div className="hidden items-center gap-2 rounded-md border border-pistachio/50 bg-pistachio/20 px-3 py-2 text-sm text-emerald-50 backdrop-blur sm:flex">
                <CheckCircle2 className="h-4 w-4 text-pistachio" aria-hidden="true" />
                Plataforma activa
              </div>
            </div>

            <div className="max-w-3xl animate-slide-up">
                <p className="mb-5 inline-flex rounded-md border border-pistachio/50 bg-pistachio/20 px-3 py-2 text-sm font-semibold text-emerald-50 backdrop-blur">
                Gestión sostenible universitaria
              </p>
              <h1 className="text-4xl font-bold leading-[1.08] sm:text-5xl 2xl:text-6xl">
                Acciones ecológicas medibles, recompensas claras y control académico.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-100 sm:text-lg">
                Administra evidencias, valida códigos QR y asigna puntos a la comunidad desde una experiencia estable, limpia y lista para escritorio o móvil.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {platformHighlights.map(({ icon: Icon, title }) => (
                  <div key={title} className="flex items-center gap-3 rounded-md border border-pistachio/40 bg-white/10 p-3 text-sm font-semibold text-white backdrop-blur">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-fern">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {title}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/15 pt-6 text-sm text-emerald-50">
              <div className="inline-flex items-center gap-4 rounded-md border border-pistachio/40 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-2xl font-bold text-white">24/7</p>
                <p>acceso web</p>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 flex min-h-screen items-center justify-center bg-white px-6 py-10 sm:px-10 lg:order-2">
          <div className="w-full max-w-[430px] animate-slide-up">
            <div className="mb-9">
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <UniversityLogo className="max-h-12" />
              </div>
              <h2 className="text-3xl font-bold leading-tight text-fern sm:text-4xl">
                Iniciar sesión
              </h2>
              <p className="mt-3 text-base leading-6 text-slate-600">
                Ingresa con tus credenciales institucionales para continuar al panel.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Correo institucional
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-md border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 shadow-sm transition focus:border-fern focus:outline-none focus:ring-2 focus:ring-fern/20"
                    placeholder="usuario@puce.edu.ec"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <a href="#" className="text-sm font-semibold text-fern transition hover:text-delft">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-md border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 shadow-sm transition focus:border-fern focus:outline-none focus:ring-2 focus:ring-fern/20"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-fern px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#162052] focus:outline-none focus:ring-2 focus:ring-fern focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Procesando..." : "Acceder al sistema"}
                {!loading && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
              </button>
            </form>

            <div className="mt-8 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              Tus solicitudes, puntos y recompensas se cargan después de iniciar sesión.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
