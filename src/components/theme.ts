import type { CSSProperties } from 'react';
import type { FlavorCategory } from '../types';

// Paleta tomada de muestras del logo. Los mismos valores están declarados
// como variables de Tailwind en src/index.css.
export const colors = {
  brick: '#0e0c0f',
  cyan: '#5ee7ff',
  magenta: '#ff5cc4',
  purple: '#b44dff',
  blue: '#3b8bff',
  yellow: '#ffe95e',
  lime: '#c6ff4a',
  green: '#5dff9b',
  red: '#ff6b7d',
  orange: '#ffa64a',
  sky: '#7fb2ff',
  white: '#ffffff',
} as const;

// Color neón de cada categoría de sabor.
export const flavorColors: Record<FlavorCategory, string> = {
  granizado: colors.cyan,
  cremoso: colors.magenta,
  artesanal: colors.lime,
};

// Nombre visible de cada categoría de sabor.
export const flavorLabels: Record<FlavorCategory, string> = {
  granizado: 'Granizado',
  cremoso: 'Cremoso',
  artesanal: 'Artesanal',
};

// Color neón de cada sección de la carta, según el nombre guardado en la base de datos.
const sectionColors: Record<string, string> = {
  cyan: colors.cyan,
  lime: colors.lime,
  pink: colors.magenta,
  yellow: colors.yellow,
  green: colors.green,
  red: colors.red,
  orange: colors.orange,
  blue: colors.sky,
};

// Devuelve el color de una sección; si el nombre no se reconoce, usa el cian.
export function sectionColor(name: string): string {
  return sectionColors[name] ?? colors.cyan;
}

// Estilo que fija el color de las clases .neon-text, .neon-box y .neon-pill
// mediante la variable CSS --neon.
export function neon(color: string): CSSProperties {
  return { '--neon': color } as CSSProperties;
}
