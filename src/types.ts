// Tipos compartidos por la interfaz; reflejan lo que devuelve la API.

export type FlavorCategory = 'granizado' | 'cremoso' | 'artesanal';

// Sabor tal como aparece en el menú público.
export type MenuFlavor = {
  id: number;
  name: string;
  description: string;
  category: FlavorCategory;
  image_url: string | null;
};

// Sabor del catálogo, con los datos que usa el panel.
export type Flavor = MenuFlavor & {
  is_today: boolean;
  today_order: number;
};

// Producto de la carta. El precio está en pesos, como número entero.
export type Product = {
  id: number;
  category_id: number;
  label: string;
  price: number;
  description: string;
  image_url: string | null;
};

// Sección de la carta con sus productos.
export type Category = {
  id: number;
  name: string;
  color: string;
  products: Product[];
};

// Respuesta de GET /api/menu.
export type Menu = {
  flavors: MenuFlavor[];
  categories: Category[];
};
