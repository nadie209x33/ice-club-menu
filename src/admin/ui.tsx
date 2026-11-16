import type { ButtonHTMLAttributes } from 'react';
import { colors, neon } from '../components/theme';

// Función que entrega AdminPage a las pestañas para ejecutar un cambio:
// llama a la API, recarga los datos y muestra el aviso de éxito o de error.
// Devuelve true si el cambio se guardó.
export type Run = (action: () => Promise<unknown>, okText?: string) => Promise<boolean>;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { color?: string };

// Botón en forma de píldora de neón, del color indicado.
export function Button({ color = colors.cyan, className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      style={neon(color)}
      className={`neon-pill bg-black/50 px-4 py-2 text-sm font-semibold transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}
