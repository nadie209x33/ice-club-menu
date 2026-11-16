import { useEffect, useState } from 'react';
import { getMenu } from '../api';
import Background from '../components/Background';
import FlavorCard from '../components/FlavorCard';
import InstagramLink from '../components/InstagramLink';
import Logo from '../components/Logo';
import PriceSection from '../components/PriceSection';
import SectionTitle from '../components/SectionTitle';
import { colors } from '../components/theme';
import type { Menu } from '../types';

// Menú público: logo, sabores del día, carta de precios, enlace a Instagram
// y leyenda legal. Los datos se piden a la API al abrir la página.
export default function MenuPage() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <Background />
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <header className="pt-2">
          <h1 className="sr-only">Ice Club La Decanatura: menú</h1>
          <Logo className="w-[min(88vw,400px)]" />
        </header>

        <main>
          {error && (
            <p role="alert" className="mx-auto max-w-md rounded-2xl border border-red-400/60 bg-black/50 p-4 text-center text-red-200">
              No se pudo cargar el menú. {error}
            </p>
          )}

          {!menu && !error && (
            <p className="py-16 text-center text-sm uppercase tracking-[0.3em] text-mist">Cargando…</p>
          )}

          {menu && (
            <>
              <section aria-label="Sabores del día" className="mt-2">
                <SectionTitle color={colors.cyan} hint="Recién preparados">
                  Sabores del día
                </SectionTitle>
                {menu.flavors.length > 0 ? (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {menu.flavors.map((flavor, index) => (
                      <FlavorCard key={flavor.id} flavor={flavor} index={index} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-mist">Hoy todavía no hay sabores seleccionados.</p>
                )}
              </section>

              <section aria-label="Carta de precios" className="mt-14">
                <SectionTitle color={colors.magenta} hint="Precios en miles de pesos">
                  Carta
                </SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {menu.categories.map((category, index) => (
                    <PriceSection key={category.id} category={category} index={index} />
                  ))}
                </div>
              </section>
            </>
          )}

          <div className="mt-12 text-center">
            <InstagramLink />
          </div>
        </main>

        <footer className="mx-auto mt-12 max-w-2xl border-t border-white/15 pt-6 text-center text-xs leading-relaxed text-mist">
          Prohibido el expendio de bebidas embriagantes a menores de edad. El exceso de alcohol es
          perjudicial para la salud.
        </footer>
      </div>
    </>
  );
}
