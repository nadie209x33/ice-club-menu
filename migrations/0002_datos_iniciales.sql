-- Datos iniciales: 17 sabores, 8 secciones de la carta y 15 productos.

-- Sabores. Los cinco primeros quedan como sabores del día, en ese orden.
INSERT INTO flavors (name, description, category, is_today, today_order) VALUES
  ('Blue Session',      'Vodka, limón y frutos tropicales',       'granizado', 1, 1),
  ('Mango Tequila',     'Mango biche y tequila',                  'granizado', 1, 2),
  ('Mora Azul',         'Vodka, tequila y mora azul',             'granizado', 1, 3),
  ('Pre-Kinder',        'Frutos rojos, sandía y whisky',          'granizado', 1, 4),
  ('Ojo de Diablo',     'Kola, granadina, vodka y tequila',       'granizado', 1, 5),
  ('Cosmopolitan',      'Arándanos, durazno y vodka',             'granizado', 0, 0),
  ('Sex on the Beach',  'Vodka, naranja y frutos silvestres',     'granizado', 0, 0),
  ('Tropical Cherry',   'Vodka, cereza, maracuyá y limón',        'granizado', 0, 0),
  ('Tentación Blanca',  'Smirnoff Ice y limón',                   'granizado', 0, 0),
  ('Tamarindo Tequila', '',                                       'granizado', 0, 0),
  ('Éxtasis',           'Uva, sandía y whisky',                   'granizado', 0, 0),
  ('Piña Colada',       'Ron y piña',                             'cremoso',   0, 0),
  ('Crema de Whisky',   'Baileys',                                'cremoso',   0, 0),
  ('Rosé',              'Vino rosado, ginebra y lychee',          'artesanal', 0, 0),
  ('Blanche',           'Vino blanco, ginebra y lychee',          'artesanal', 0, 0),
  ('Épicé',             'Vino blanco, tequila y toronja',         'artesanal', 0, 0),
  ('Spritz',            'Vino blanco, Aperol, Spritz y naranja',  'artesanal', 0, 0);

-- Secciones de la carta, con su color neón y su orden de aparición.
INSERT INTO categories (id, name, color, sort_order) VALUES
  (1, 'Granizados',  'cyan',   1),
  (2, 'Artesanales', 'lime',   2),
  (3, 'Cremosos',    'pink',   3),
  (4, 'Peceras',     'yellow', 4),
  (5, 'Cubetazo',    'green',  5),
  (6, 'Shots',       'red',    6),
  (7, 'Adiciones',   'orange', 7),
  (8, 'Agua',        'blue',   8);

-- Productos de cada sección, con el precio en pesos.
INSERT INTO products (category_id, label, price, sort_order) VALUES
  (1, '12 onz',    12000, 1),
  (1, '16 onz',    15000, 2),
  (2, '250 ml',    20000, 1),
  (2, '350 ml',    25000, 2),
  (2, '1 L',       65000, 3),
  (3, '12 onz',    15000, 1),
  (3, '16 onz',    18000, 2),
  (4, 'Para 4',    50000, 1),
  (5, 'Para 8',    80000, 1),
  (6, 'Vodka',      5000, 1),
  (6, 'Tequila',    6000, 2),
  (6, 'Whiskey',    7000, 3),
  (7, 'Toppings',   3000, 1),
  (7, 'Jeringazo',  3000, 2),
  (8, '300 ml',     1500, 1);
