import { useEffect, useMemo, useState } from 'react';
import { setToday } from '../api';
import { colors, flavorColors, flavorLabels } from '../components/theme';
import type { Flavor } from '../types';
import { Button } from './ui';
import type { Run } from './ui';

const MAX_TODAY = 5;

type TodayTabProps = {
  flavors: Flavor[];
  run: Run;
};

// Pestaña "Sabores del día": permite elegir hasta cinco sabores y ordenarlos.
// Los cambios se aplican al menú al pulsar "Guardar".
export default function TodayTab({ flavors, run }: TodayTabProps) {
  // Selección guardada en el servidor, en orden.
  const saved = useMemo(
    () =>
      flavors
        .filter((f) => f.is_today)
        .sort((a, b) => a.today_order - b.today_order)
        .map((f) => f.id),
    [flavors],
  );
  const savedKey = saved.join(',');
  const [draft, setDraft] = useState<number[]>(saved);

  // La selección en pantalla se iguala a la guardada solo cuando esta cambia de verdad.
  // Una recarga de datos por otro motivo (por ejemplo, subir una foto) no descarta
  // los cambios que aún no se han guardado.
  useEffect(() => {
    setDraft(savedKey ? savedKey.split(',').map(Number) : []);
  }, [savedKey]);

  // Se descartan de la selección los sabores que ya no existen en el catálogo.
  const byId = new Map(flavors.map((f) => [f.id, f]));
  const ids = draft.filter((id) => byId.has(id));
  const setIds = setDraft;
  const selected = ids.map((id) => byId.get(id)!);
  const available = flavors.filter((f) => !ids.includes(f.id));
  const changed = ids.join(',') !== savedKey;
  const full = ids.length >= MAX_TODAY;

  // Intercambia un sabor con su vecino para subirlo o bajarlo de posición.
  function move(index: number, delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setIds(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mist">
          En el menú ({ids.length} de {MAX_TODAY})
        </h2>
        {selected.length === 0 && <p className="text-mist">No hay sabores seleccionados.</p>}
        <ol className="space-y-2">
          {selected.map((flavor, index) => (
            <li
              key={flavor.id}
              className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/50 px-3 py-2"
            >
              <span className="w-5 text-center text-lg font-bold text-neon-cyan">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{flavor.name}</span>
              <Button
                aria-label={`Subir ${flavor.name}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="px-3!"
              >
                ↑
              </Button>
              <Button
                aria-label={`Bajar ${flavor.name}`}
                disabled={index === selected.length - 1}
                onClick={() => move(index, 1)}
                className="px-3!"
              >
                ↓
              </Button>
              <Button
                color={colors.red}
                aria-label={`Quitar ${flavor.name}`}
                onClick={() => setIds(ids.filter((id) => id !== flavor.id))}
                className="px-3!"
              >
                ✕
              </Button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <Button
            color={colors.lime}
            disabled={!changed}
            onClick={() => run(() => setToday(ids), 'Sabores del día guardados')}
          >
            Guardar
          </Button>
          <Button color={colors.sky} disabled={!changed} onClick={() => setIds(saved)}>
            Descartar cambios
          </Button>
        </div>
        {changed && (
          <p className="mt-2 text-sm text-neon-yellow">
            Hay cambios sin guardar: el menú no cambia hasta pulsar "Guardar".
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mist">
          Catálogo disponible
        </h2>
        {full && <p className="mb-2 text-sm text-neon-yellow">Para agregar otro, primero hay que quitar uno.</p>}
        <ul className="space-y-2">
          {available.map((flavor) => (
            <li
              key={flavor.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{flavor.name}</span>
                <span className="text-xs" style={{ color: flavorColors[flavor.category] }}>
                  {flavorLabels[flavor.category]}
                </span>
              </span>
              <Button disabled={full} aria-label={`Agregar ${flavor.name}`} onClick={() => setIds([...ids, flavor.id])}>
                Agregar
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
