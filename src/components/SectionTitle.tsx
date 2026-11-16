import Sparkle from './Sparkle';
import { colors, neon } from './theme';

type SectionTitleProps = {
  children: string;
  color: string;
};

// Título de sección en cursiva de neón, con destellos a los lados.
export default function SectionTitle({ children, color }: SectionTitleProps) {
  return (
    <div className="mb-6 text-center">
      <h2 className="inline-flex items-center gap-3">
        <Sparkle color={colors.yellow} size={14} delay={0.4} />
        <span className="neon-text font-script text-5xl leading-none sm:text-6xl" style={neon(color)}>
          {children}
        </span>
        <Sparkle color={colors.cyan} size={14} delay={1.5} />
      </h2>
    </div>
  );
}
