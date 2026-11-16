import { motion } from 'motion/react';
import { formatPrice } from '../api';
import type { Category } from '../types';
import { neon, sectionColor } from './theme';

type PriceSectionProps = {
  category: Category;
  index: number;
};

// Sección de la carta: nombre en neón del color de la sección y la lista
// de productos con su precio alineado a la derecha.
export default function PriceSection({ category, index }: PriceSectionProps) {
  const color = sectionColor(category.color);
  return (
    <motion.section
      className="neon-box rounded-2xl bg-black/50 px-4 py-4 backdrop-blur-sm"
      style={neon(color)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: (index % 2) * 0.08 }}
    >
      <h3 className="neon-text font-script text-4xl leading-none" style={neon(color)}>
        {category.name}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {category.products.map((product) => (
          <li key={product.id} className="flex items-center gap-3">
            {product.image_url && (
              <img
                src={product.image_url}
                alt=""
                loading="lazy"
                className="size-11 shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-base font-medium text-white">{product.label}</p>
              {product.description && (
                <p className="text-xs leading-snug text-mist">{product.description}</p>
              )}
            </div>
            <span aria-hidden="true" className="h-px min-w-4 flex-1 self-center border-t border-dotted border-white/25" />
            <span
              className="shrink-0 text-xl font-bold tabular-nums"
              style={{ color: `color-mix(in srgb, ${color} 45%, white)`, textShadow: `0 0 10px ${color}` }}
            >
              {formatPrice(product.price)}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
