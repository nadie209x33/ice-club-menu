type SparkleProps = {
  color: string;
  size?: number;
  delay?: number;
  className?: string;
};

// Destello de cuatro puntas, como los del logo. Titila con un retraso opcional
// para que varios destellos no parpadeen a la vez.
export default function Sparkle({ color, size = 16, delay = 0, className = '' }: SparkleProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`twinkle pointer-events-none ${className}`}
      style={{ animationDelay: `${delay}s`, filter: `drop-shadow(0 0 4px ${color})` }}
    >
      <path
        d="M12 0C12.7 7.2 16.8 11.3 24 12C16.8 12.7 12.7 16.8 12 24C11.3 16.8 7.2 12.7 0 12C7.2 11.3 11.3 7.2 12 0Z"
        fill={color}
      />
    </svg>
  );
}
