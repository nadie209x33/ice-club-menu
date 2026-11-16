// Descarga una copia de seguridad de la base de datos de producción a un archivo SQL.
// Uso: npm run backup              copia completa en la carpeta backups/
//      npm run backup -- --carta   solo sabores, secciones y productos
//      npm run backup -- <carpeta> guarda la copia en otra carpeta
//
// La copia completa incluye la tabla de administradores, con el hash de la contraseña:
// no debe compartirse ni subirse a Git. La carpeta backups/ está excluida de Git.

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATABASE = 'ice-club-db';
const INDEXES_FILE = new URL('./indices.sql', import.meta.url);
const MENU_TABLES = ['flavors', 'categories', 'products'];

// Devuelve la fecha y la hora actuales en formato AAAA-MM-DD-HHMM, para el nombre del archivo.
function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

// Ejecuta la exportación con Wrangler y comprueba que el archivo no quedó vacío.
function main() {
  const args = process.argv.slice(2);
  const menuOnly = args.includes('--carta');
  const folder = args.find((arg) => !arg.startsWith('--')) ?? 'backups';
  mkdirSync(folder, { recursive: true });

  const file = join(folder, `${DATABASE}-${menuOnly ? 'carta-' : ''}${timestamp()}.sql`);
  const tables = menuOnly ? MENU_TABLES.flatMap((table) => ['--table', table]) : [];
  const command = ['wrangler', 'd1', 'export', DATABASE, '--remote', ...tables, '--output', `"${file}"`];

  const result = spawnSync('npx', command, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    throw new Error('La exportación falló. Puede hacer falta iniciar sesión con "npx wrangler login".');
  }
  if (statSync(file).size === 0) throw new Error('La copia quedó vacía.');

  // La exportación por tablas no incluye los índices: se añaden al final del archivo.
  if (menuOnly) appendFileSync(file, `\n${readFileSync(INDEXES_FILE, 'utf8')}`);

  console.log(`\nCopia guardada en ${file} (${statSync(file).size} bytes).`);
  if (!menuOnly) {
    console.log('Incluye la tabla de administradores: no debe compartirse ni subirse a Git.');
  }
}

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
