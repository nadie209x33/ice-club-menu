import type { Category, Flavor, FlavorCategory, Menu } from './types';

// Error devuelto por la API, con el mensaje en español y el estado HTTP.
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Hace una petición a la API y devuelve el JSON; si la respuesta es un error,
// lanza ApiError con el mensaje que envía el servidor.
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError('No hay conexión con el servidor', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error ?? 'No se pudo completar la solicitud', response.status);
  }
  return data as T;
}

// Consulta el menú público: sabores del día y carta.
export function getMenu(): Promise<Menu> {
  return request<Menu>('/menu');
}

// Envía datos en JSON a la API con el método indicado.
function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Datos editables de un sabor y de un producto.
export type FlavorInput = { name: string; description: string; category: FlavorCategory };
export type ProductInput = { category_id: number; label: string; price: number; description: string };
export type ImageKind = 'flavors' | 'products';

// Sesión: usuario actual, inicio y cierre.
export const getMe = () => request<{ username: string }>('/auth/me');
export const login = (username: string, password: string) =>
  send<{ username: string }>('POST', '/auth/login', { username, password });
export const logout = () => send<{ ok: true }>('POST', '/auth/logout');

// Catálogo de sabores.
export const getFlavors = () => request<{ flavors: Flavor[] }>('/admin/flavors');
export const createFlavor = (data: FlavorInput) => send('POST', '/admin/flavors', data);
export const updateFlavor = (id: number, data: FlavorInput) => send('PUT', `/admin/flavors/${id}`, data);
export const deleteFlavor = (id: number) => send('DELETE', `/admin/flavors/${id}`);

// Sabores del día: lista ordenada de identificadores, máximo cinco.
export const setToday = (ids: number[]) => send('PUT', '/admin/today', { ids });

// Carta de precios.
export const getProducts = () => request<{ categories: Category[] }>('/admin/products');
export const createProduct = (data: ProductInput) => send('POST', '/admin/products', data);
export const updateProduct = (id: number, data: ProductInput) => send('PUT', `/admin/products/${id}`, data);
export const deleteProduct = (id: number) => send('DELETE', `/admin/products/${id}`);

// Secciones de la carta: alta, edición y eliminación (con todos sus productos).
export type CategoryInput = { name: string; color: string };
export const createCategory = (data: CategoryInput) => send('POST', '/admin/categories', data);
export const updateCategory = (id: number, data: CategoryInput) => send('PUT', `/admin/categories/${id}`, data);
export const deleteCategory = (id: number) => send('DELETE', `/admin/categories/${id}`);

// Orden de las secciones y de los productos de una sección: lista completa de identificadores.
export const orderCategories = (ids: number[]) => send('PUT', '/admin/order/categories', { ids });
export const orderProducts = (categoryId: number, ids: number[]) =>
  send('PUT', `/admin/order/products/${categoryId}`, { ids });

// Cambio de contraseña del administrador con sesión.
export const changePassword = (current: string, next: string) =>
  send('POST', '/admin/password', { current, next });

// Fotos: el cuerpo de la petición es el archivo ya comprimido.
export const uploadImage = (kind: ImageKind, id: number, image: Blob) =>
  request(`/admin/images/${kind}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': image.type },
    body: image,
  });
export const deleteImage = (kind: ImageKind, id: number) => send('DELETE', `/admin/images/${kind}/${id}`);

// Da formato corto a un precio en pesos: 12000 → $12K, 1500 → $1.5K, 500 → $500.
export function formatPrice(price: number): string {
  return price < 1000 ? `$${price}` : `$${price / 1000}K`;
}
