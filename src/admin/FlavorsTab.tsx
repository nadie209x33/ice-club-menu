import { useState } from 'react';
import type { FormEvent } from 'react';
import { createFlavor, deleteFlavor, updateFlavor } from '../api';
import type { FlavorInput } from '../api';
import { colors, flavorColors, flavorLabels } from '../components/theme';
import type { Flavor, FlavorCategory } from '../types';
import ImagePicker from './ImagePicker';
import { Button } from './ui';
import type { Run } from './ui';

const EMPTY: FlavorInput = { name: '', description: '', category: 'granizado' };

type FlavorFormProps = {
  initial: FlavorInput;
  onSubmit: (data: FlavorInput) => Promise<boolean>;
  onCancel: () => void;
};

// Formulario de un sabor: nombre, descripción y categoría.
function FlavorForm({ initial, onSubmit, onCancel }: FlavorFormProps) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);

  // Envía el formulario y lo cierra si el cambio se guardó.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await onSubmit(data);
    setBusy(false);
    if (ok) onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm text-mist">
        Nombre
        <input
          className="field mt-1"
          required
          maxLength={60}
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </label>
      <label className="block text-sm text-mist">
        Categoría
        <select
          className="field mt-1"
          value={data.category}
          onChange={(e) => setData({ ...data, category: e.target.value as FlavorCategory })}
        >
          {Object.entries(flavorLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-mist sm:col-span-2">
        Descripción (opcional)
        <input
          className="field mt-1"
          maxLength={200}
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" color={colors.lime} disabled={busy}>
          Guardar
        </Button>
        <Button color={colors.sky} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

type FlavorsTabProps = {
  flavors: Flavor[];
  run: Run;
};

// Pestaña "Sabores": catálogo completo, con creación, edición, eliminación y foto.
export default function FlavorsTab({ flavors, run }: FlavorsTabProps) {
  // Identificador del sabor en edición, 'new' para el formulario de alta, o null.
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  // Pide confirmación y elimina un sabor.
  function handleDelete(flavor: Flavor) {
    const warning = flavor.is_today ? ' Es un sabor del día: dejará de aparecer en el menú.' : '';
    if (window.confirm(`¿Eliminar el sabor "${flavor.name}"?${warning} Esta acción no se puede deshacer.`)) {
      run(() => deleteFlavor(flavor.id), 'Sabor eliminado');
    }
  }

  return (
    <div>
      {editing === 'new' ? (
        <div className="mb-5 rounded-2xl border border-neon-lime/60 bg-black/50 p-4">
          <h2 className="mb-3 font-semibold">Nuevo sabor</h2>
          <FlavorForm
            initial={EMPTY}
            onSubmit={(data) => run(() => createFlavor(data), 'Sabor creado')}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <Button color={colors.lime} className="mb-5" onClick={() => setEditing('new')}>
          + Nuevo sabor
        </Button>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        {flavors.map((flavor) => (
          <li key={flavor.id} className="rounded-2xl border border-white/15 bg-black/50 p-4">
            {editing === flavor.id ? (
              <FlavorForm
                initial={{ name: flavor.name, description: flavor.description, category: flavor.category }}
                onSubmit={(data) => run(() => updateFlavor(flavor.id, data), 'Sabor actualizado')}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{flavor.name}</h3>
                    <p className="text-xs font-medium" style={{ color: flavorColors[flavor.category] }}>
                      {flavorLabels[flavor.category]}
                      {flavor.is_today && <span className="text-neon-yellow"> · Sabor del día</span>}
                    </p>
                    <p className="mt-1 text-sm text-mist">{flavor.description || 'Sin descripción'}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button aria-label={`Editar ${flavor.name}`} onClick={() => setEditing(flavor.id)}>
                      Editar
                    </Button>
                    <Button
                      color={colors.red}
                      aria-label={`Eliminar ${flavor.name}`}
                      onClick={() => handleDelete(flavor)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <ImagePicker kind="flavors" id={flavor.id} imageUrl={flavor.image_url} run={run} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
