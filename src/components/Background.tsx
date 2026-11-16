// Fondo fijo de toda la página: pared de ladrillo negro con dos resplandores
// tenues, cian y magenta, como la luz de los tubos sobre la pared.
export default function Background() {
  return (
    <div aria-hidden="true" className="brick-wall fixed inset-0 -z-10">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-neon-blue/15 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[520px] translate-x-1/3 translate-y-1/3 rounded-full bg-neon-magenta/10 blur-[120px]" />
    </div>
  );
}
