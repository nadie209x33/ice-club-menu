import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  formatPrice,
  orderCategories,
  orderProducts,
  updateCategory,
  updateProduct,
} from '../api';
import type { CategoryInput, ProductInput } from '../api';
import { colors, sectionColor, sectionColorLabels } from '../components/theme';
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

type CategoryFormProps = {
  initial: CategoryInput;
  onSubmit: (data: CategoryInput) => Promise<boolean>;
  onCancel: () => void;
};

// Formulario de una sección: nombre y color de neón.
function CategoryForm({ initial, onSubmit, onCancel }: CategoryFormProps) {
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
        Nombre de la sección
        <input
          className="field mt-1"
          required
          maxLength={40}
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
      </label>
      <label className="block text-sm text-mist">
        Color
        <span className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-6 shrink-0 rounded-full"
            style={{ backgroundColor: sectionColor(data.color), boxShadow: `0 0 8px ${sectionColor(data.color)}` }}
          />
          <select
            className="field"
            value={data.color}
            onChange={(e) => setData({ ...data, color: e.target.value })}
          >
            {Object.entries(sectionColorLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </span>
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

// Formulario abierto en la pestaña: edición de un producto, alta de un producto
// en una sección, edición de una sección o alta de una sección.
type OpenForm =
  | { product: number }
  | { newProductIn: number }
  | { category: number }
  | { newCategory: true }
  | null;

// Devuelve una copia de la lista con el elemento de la posición indicada
// intercambiado con su vecino.
function swapped(ids: number[], index: number, delta: number): number[] {
  const next = [...ids];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}

type PricesTabProps = {
  categories: Category[];
  run: Run;
};

// Pestaña "Precios": la carta por secciones. Permite crear, editar, reordenar y
// eliminar secciones y productos, y gestionar la foto de cada producto.
// Los cambios de orden se guardan al instante.
export default function PricesTab({ categories, run }: PricesTabProps) {
  const [open, setOpen] = useState<OpenForm>(null);

  // Pide confirmación y elimina un producto.
  function handleDeleteProduct(product: Product) {
    if (window.confirm(`¿Eliminar "${product.label}" de la carta? Esta acción no se puede deshacer.`)) {
      run(() => deleteProduct(product.id), 'Producto eliminado');
    }
  }

  // Pide confirmación y elimina una sección con todos sus productos.
  function handleDeleteCategory(category: Category) {
    const count = category.products.length;
    const detail = count > 0 ? ` y sus ${count} producto${count === 1 ? '' : 's'}` : '';
    if (window.confirm(`¿Eliminar la sección "${category.name}"${detail}? Esta acción no se puede deshacer.`)) {
      run(() => deleteCategory(category.id), 'Sección eliminada');
    }
  }

  // Sube o baja una sección en la carta.
  function moveCategory(index: number, delta: number) {
    const ids = swapped(categories.map((c) => c.id), index, delta);
    run(() => orderCategories(ids));
  }

  // Sube o baja un producto dentro de su sección.
  function moveProduct(category: Category, index: number, delta: number) {
    const ids = swapped(category.products.map((p) => p.id), index, delta);
    run(() => orderProducts(category.id, ids));
  }

  return (
    <div>
      {open && 'newCategory' in open ? (
        <div className="mb-5 rounded-2xl border border-neon-lime/60 bg-black/50 p-4">
          <h2 className="mb-3 font-semibold">Nueva sección</h2>
          <CategoryForm
            initial={{ name: '', color: 'cyan' }}
            onSubmit={(data) => run(() => createCategory(data), 'Sección creada')}
            onCancel={() => setOpen(null)}
          />
        </div>
      ) : (
        <Button color={colors.lime} className="mb-5" onClick={() => setOpen({ newCategory: true })}>
          + Nueva sección
        </Button>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category, categoryIndex) => (
          <section key={category.id} className="rounded-2xl border border-white/15 bg-black/50 p-4">
            {open && 'category' in open && open.category === category.id ? (
              <CategoryForm
                initial={{ name: category.name, color: category.color }}
                onSubmit={(data) => run(() => updateCategory(category.id, data), 'Sección actualizada')}
                onCancel={() => setOpen(null)}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-script text-3xl" style={{ color: sectionColor(category.color) }}>
                  {category.name}
                </h2>
                <div className="flex gap-2">
                  <Button
                    aria-label={`Subir sección ${category.name}`}
                    disabled={categoryIndex === 0}
                    onClick={() => moveCategory(categoryIndex, -1)}
                    className="px-3!"
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label={`Bajar sección ${category.name}`}
                    disabled={categoryIndex === categories.length - 1}
                    onClick={() => moveCategory(categoryIndex, 1)}
                    className="px-3!"
                  >
                    ↓
                  </Button>
                  <Button
                    aria-label={`Editar sección ${category.name}`}
                    onClick={() => setOpen({ category: category.id })}
                  >
                    Editar
                  </Button>
                  <Button
                    color={colors.red}
                    aria-label={`Eliminar sección ${category.name}`}
                    onClick={() => handleDeleteCategory(category)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            )}

            {category.products.length === 0 && (
              <p className="mt-2 text-sm text-mist">
                Sin productos. La sección no aparece en el menú hasta que tenga al menos uno.
              </p>
            )}

            <ul className="mt-2 divide-y divide-white/10">
              {category.products.map((product, productIndex) => (
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                            aria-label={`Subir ${category.name} ${product.label}`}
                            disabled={productIndex === 0}
                            onClick={() => moveProduct(category, productIndex, -1)}
                            className="px-3!"
                          >
                            ↑
                          </Button>
                          <Button
                            aria-label={`Bajar ${category.name} ${product.label}`}
                            disabled={productIndex === category.products.length - 1}
                            onClick={() => moveProduct(category, productIndex, 1)}
                            className="px-3!"
                          >
                            ↓
                          </Button>
                          <Button
                            aria-label={`Editar ${category.name} ${product.label}`}
                            onClick={() => setOpen({ product: product.id })}
                          >
                            Editar
                          </Button>
                          <Button
                            color={colors.red}
                            aria-label={`Eliminar ${category.name} ${product.label}`}
                            onClick={() => handleDeleteProduct(product)}
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

            {open && 'newProductIn' in open && open.newProductIn === category.id ? (
              <div className="mt-2 border-t border-white/10 pt-3">
                <ProductForm
                  isNew
                  initial={{ category_id: category.id, label: '', price: 0, description: '' }}
                  onSubmit={(data) => run(() => createProduct(data), 'Producto creado')}
                  onCancel={() => setOpen(null)}
                />
              </div>
            ) : (
              <Button color={colors.lime} className="mt-2" onClick={() => setOpen({ newProductIn: category.id })}>
                + Agregar producto
              </Button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
