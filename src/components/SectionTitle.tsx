import Sparkle from './Sparkle';
import { colors, neon } from './theme';

type SectionTitleProps = {
  children: string;
  color: string;
  hint?: string;
};

// Título de sección en cursiva de neón, con destellos a los lados
// y una línea de apoyo opcional en mayúsculas.
export default function SectionTitle({ children, color, hint }: SectionTitleProps) {
  return (
    <div className="mb-6 text-center">
      <h2 className="inline-flex items-center gap-3">
        <Sparkle color={colors.yellow} size={14} delay={0.4} />
        <span className="neon-text font-script text-5xl leading-none sm:text-6xl" style={neon(color)}>
          {children}
        </span>
        <Sparkle color={colors.cyan} size={14} delay={1.5} />
      </h2>
      {hint && (
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-mist">{hint}</p>
      )}
    </div>
  );
}
