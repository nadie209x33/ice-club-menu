import Sparkle from './Sparkle';
import { colors } from './theme';

type LogoProps = {
  className?: string;
};

// Logo completo del negocio, fundido con la pared de fondo y rodeado de destellos.
export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`relative mx-auto aspect-square ${className}`}>
      <img
        src="/logo.jpg"
        alt="Ice Club La Decanatura"
        width={1000}
        height={1000}
        className="logo-blend h-full w-full select-none"
        draggable={false}
      />
      <Sparkle color={colors.yellow} size={18} className="absolute left-[2%] top-[14%]" />
      <Sparkle color={colors.cyan} size={14} delay={0.9} className="absolute right-[4%] top-[6%]" />
      <Sparkle color={colors.magenta} size={16} delay={1.7} className="absolute bottom-[10%] right-[1%]" />
    </div>
  );
}
