import { motion } from 'motion/react';
import type { MenuFlavor } from '../types';
import Sparkle from './Sparkle';
import { colors, flavorColors, flavorLabels, neon } from './theme';

type FlavorCardProps = {
  flavor: MenuFlavor;
  index: number;
};

// Tarjeta de un sabor del día: foto (o degradado tipo galaxia si no hay),
// etiqueta de categoría, nombre en neón y descripción.
export default function FlavorCard({ flavor, index }: FlavorCardProps) {
  const color = flavorColors[flavor.category];
  return (
    <motion.li
      className="neon-box flex items-center gap-4 rounded-2xl bg-black/50 p-3 backdrop-blur-sm lg:flex-col lg:items-stretch lg:gap-3"
      style={neon(color)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl lg:aspect-square lg:size-auto lg:w-full">
        {flavor.image_url ? (
          <img
            src={flavor.image_url}
            alt={flavor.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="galaxy relative h-full w-full">
            <Sparkle color={colors.white} size={14} delay={index * 0.5} className="absolute left-[18%] top-[20%]" />
            <Sparkle color={colors.yellow} size={10} delay={index * 0.5 + 1.2} className="absolute bottom-[22%] right-[20%]" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 lg:text-center">
        <span
          className="neon-pill inline-block px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
          style={neon(color)}
        >
          {flavorLabels[flavor.category]}
        </span>
        <h3 className="neon-text mt-1.5 font-script text-3xl leading-tight" style={neon(color)}>
          {flavor.name}
        </h3>
        {flavor.description && (
          <p className="mt-1 text-sm leading-snug text-mist">{flavor.description}</p>
        )}
      </div>
    </motion.li>
  );
}
