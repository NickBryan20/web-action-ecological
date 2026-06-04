export default function UniversityLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/puce-ibarra-logo-transparent.png"
      alt="Pontificia Universidad Católica del Ecuador Sede Ibarra"
      className={`h-auto w-auto ${className}`}
    />
  );
}
