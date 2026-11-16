import { useState } from 'react';
import type { FormEvent } from 'react';
import { changePassword } from '../api';
import { colors } from '../components/theme';
import { Button } from './ui';
import type { Run } from './ui';

const MIN_PASSWORD_LENGTH = 8;

type AccountTabProps = {
  username: string;
  run: Run;
};

// Pestaña "Cuenta": cambio de contraseña del administrador.
export default function AccountTab({ username, run }: AccountTabProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeated, setRepeated] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = repeated !== '' && next !== repeated;

  // Cambia la contraseña y limpia el formulario si el cambio se guardó.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (next !== repeated) return;
    setBusy(true);
    const ok = await run(() => changePassword(current, next), 'Contraseña cambiada');
    setBusy(false);
    if (ok) {
      setCurrent('');
      setNext('');
      setRepeated('');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/15 bg-black/50 p-4">
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-mist">
          Usuario: {username}. Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* Campo oculto para que el gestor de contraseñas asocie la clave al usuario. */}
          <input type="text" autoComplete="username" value={username} readOnly hidden />
          <label className="block text-sm text-mist">
            Contraseña actual
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="block text-sm text-mist">
            Contraseña nueva (mínimo {MIN_PASSWORD_LENGTH} caracteres)
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={256}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label className="block text-sm text-mist">
            Repetir la contraseña nueva
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              required
              value={repeated}
              onChange={(e) => setRepeated(e.target.value)}
            />
          </label>
          {mismatch && (
            <p role="alert" className="text-sm text-red-300">
              Las contraseñas nuevas no coinciden.
            </p>
          )}
          <Button type="submit" color={colors.lime} disabled={busy || mismatch}>
            {busy ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </section>

    </div>
  );
}
