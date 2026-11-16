// Genera admin.sql con un usuario administrador para aplicarlo a la base de datos.
// Uso: npm run create-admin
// La contraseña no se muestra ni se guarda; en admin.sql solo quedan el hash y la sal.

import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

// Parámetros del hash. Deben coincidir exactamente con server/auth.ts.
const PBKDF2_ITERATIONS = 100000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

// Pide un dato por consola mostrando lo que se escribe.
async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

// Pide un dato por consola sin mostrar lo que se escribe.
function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let value = '';
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') process.exit(1);
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

// Obtiene usuario y contraseña: de las variables ADMIN_USER y ADMIN_PASSWORD si existen,
// o preguntando por consola.
async function readCredentials() {
  if (process.env.ADMIN_USER && process.env.ADMIN_PASSWORD) {
    return { username: process.env.ADMIN_USER, password: process.env.ADMIN_PASSWORD };
  }
  if (!process.stdin.isTTY) {
    throw new Error('Se necesita una consola interactiva o las variables ADMIN_USER y ADMIN_PASSWORD.');
  }
  const username = await ask('Usuario: ');
  const password = await askHidden('Contraseña: ');
  const repeated = await askHidden('Repetir contraseña: ');
  if (password !== repeated) throw new Error('Las contraseñas no coinciden.');
  return { username, password };
}

// Valida los datos, calcula el hash y escribe admin.sql.
async function main() {
  const { username, password } = await readCredentials();
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('El usuario debe tener de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, HASH_BYTES, 'sha256');

  // El usuario solo admite caracteres seguros y el hash y la sal son hexadecimales,
  // por lo que pueden escribirse directamente en el SQL.
  const sql =
    `INSERT INTO admins (username, password_hash, salt) VALUES ('${username}', '${hash.toString('hex')}', '${salt.toString('hex')}')\n` +
    `ON CONFLICT (username) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt;\n`;

  writeFileSync('admin.sql', sql);
  console.log(`admin.sql generado para el usuario "${username}".`);
  console.log('Aplicarlo con: npx wrangler d1 execute ice-club-db --local --file=admin.sql');
  console.log('(usar --remote en lugar de --local para producción) y después borrar admin.sql.');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
