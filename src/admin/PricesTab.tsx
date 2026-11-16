import { useState } from 'react';
import type { FormEvent } from 'react';
import { createProduct, deleteProduct, formatPrice, updateProduct } from '../api';
import type { ProductInput } from '../api';
import { colors, sectionColor } from '../components/theme';
import type { Category, Product } from '../types';
import ImagePicker from './ImagePicker';
import { Button } from './ui';
import type { Run } from './ui';

type ProductFormProps = {
  initial: ProductInput;
  isNew?: boolean;
  onSubmit: (data: ProductInput) => Promise<boolean>;
  onCancel: () => void;
};

// Formulario de un producto: nombre, precio en pesos y descripción.
// En un producto nuevo el precio empieza vacío; al editar se muestra el guardado, incluso si es 0.
function ProductForm({ initial, isNew = false, onSubmit, onCancel }: ProductFormProps) {
  const [label, setLabel] = useState(initial.label);
  const [price, setPrice] = useState(isNew ? '' : String(initial.price));
  const [description, setDescription] = useState(initial.description);
  const [busy, setBusy] = useState(false);

  // Envía el formulario con el precio convertido a número entero y lo cierra si se guardó.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await onSubmit({ ...initial, label, price: Number(price), description });
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
          maxLength={40}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <label className="block text-sm text-mist">
        Precio en pesos
        <input
          className="field mt-1"
          type="number"
          inputMode="numeric"
          required
          min={0}
          max={10000000}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {price !== '' && (
          <span className="mt-1 block text-xs text-neon-yellow">
            En el menú se verá como {formatPrice(Number(price))}
          </span>
        )}
      </label>
      <label className="block text-sm text-mist sm:col-span-2">
        Descripción (opcional)
        <input
          className="field mt-1"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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

type PricesTabProps = {
  categories: Category[];
  run: Run;
};

// Pestaña "Precios": la carta por secciones, con edición de productos y foto.
export default function PricesTab({ categories, run }: PricesTabProps) {
  // Qué formulario está abierto: edición de un producto o alta en una sección.
  const [open, setOpen] = useState<{ product: number } | { category: number } | null>(null);

  // Pide confirmación y elimina un producto.
  function handleDelete(product: Product) {
    if (window.confirm(`¿Eliminar "${product.label}" de la carta? Esta acción no se puede deshacer.`)) {
      run(() => deleteProduct(product.id), 'Producto eliminado');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {categories.map((category) => (
        <section key={category.id} className="rounded-2xl border border-white/15 bg-black/50 p-4">
          <h2 className="font-script text-3xl" style={{ color: sectionColor(category.color) }}>
            {category.name}
          </h2>
          <ul className="mt-2 divide-y divide-white/10">
            {category.products.map((product) => (
              <li key={product.id} className="py-3">
                {open && 'product' in open && open.product === product.id ? (
                  <ProductForm
                    initial={{
                      category_id: product.category_id,
                      label: product.label,
                      price: product.price,
                      description: product.description,
                    }}
                    onSubmit={(data) => run(() => updateProduct(product.id, data), 'Producto actualizado')}
                    onCancel={() => setOpen(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {product.label}
                          <span className="ml-2 font-bold text-neon-yellow">
                            ${product.price.toLocaleString('es-CO')}
                          </span>
                        </p>
                        {product.description && <p className="text-sm text-mist">{product.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          aria-label={`Editar ${category.name} ${product.label}`}
                          onClick={() => setOpen({ product: product.id })}
                        >
                          Editar
                        </Button>
                        <Button
                          color={colors.red}
                          aria-label={`Eliminar ${category.name} ${product.label}`}
                          onClick={() => handleDelete(product)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <ImagePicker kind="products" id={product.id} imageUrl={product.image_url} run={run} />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {open && 'category' in open && open.category === category.id ? (
            <div className="mt-2 border-t border-white/10 pt-3">
              <ProductForm
                isNew
                initial={{ category_id: category.id, label: '', price: 0, description: '' }}
                onSubmit={(data) => run(() => createProduct(data), 'Producto creado')}
                onCancel={() => setOpen(null)}
              />
            </div>
          ) : (
            <Button color={colors.lime} className="mt-2" onClick={() => setOpen({ category: category.id })}>
              + Agregar producto
            </Button>
          )}
        </section>
      ))}
    </div>
  );
}
