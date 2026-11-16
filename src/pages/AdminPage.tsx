import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import FlavorsTab from '../admin/FlavorsTab';
import PricesTab from '../admin/PricesTab';
import TodayTab from '../admin/TodayTab';
import { Button } from '../admin/ui';
import type { Run } from '../admin/ui';
import { ApiError, getFlavors, getMe, getProducts, login, logout } from '../api';
import Background from '../components/Background';
import Logo from '../components/Logo';
import { colors, neon } from '../components/theme';
import type { Category, Flavor } from '../types';

const TABS = [
  { id: 'today', label: 'Sabores del día' },
  { id: 'flavors', label: 'Sabores' },
  { id: 'prices', label: 'Precios' },
] as const;

type TabId = (typeof TABS)[number]['id'];
type Notice = { kind: 'ok' | 'error'; text: string };

type LoginFormProps = {
  expired: boolean;
  onLogin: (username: string) => void;
};

// Pantalla de inicio de sesión del panel. Si la sesión venció mientras se usaba
// el panel, lo indica antes de pedir los datos de nuevo.
function LoginForm({ expired, onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Envía usuario y contraseña; si son correctos, el servidor entrega la cookie de sesión.
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(username, password);
      onLogin(result.username);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      <Logo className="w-64" />
      <form
        onSubmit={handleSubmit}
        className="neon-box mt-2 space-y-4 rounded-2xl bg-black/55 p-5 backdrop-blur-sm"
        style={neon(colors.magenta)}
      >
        <h1 className="text-center text-sm font-semibold uppercase tracking-[0.3em] text-mist">
          Panel de administrador
        </h1>
        {expired && !error && (
          <p role="status" className="text-sm text-neon-yellow">
            La sesión venció. Hay que iniciar sesión de nuevo.
          </p>
        )}
        <label className="block text-sm text-mist">
          Usuario
          <input
            className="field mt-1"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block text-sm text-mist">
          Contraseña
          <input
            className="field mt-1"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" color={colors.magenta} disabled={busy} className="w-full py-3! text-base!">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <Link to="/" className="mt-6 text-center text-sm text-mist underline underline-offset-4">
        Ver el menú
      </Link>
    </main>
  );
}

// Panel de administrador: comprueba la sesión, muestra el login si no la hay
// y, con sesión, las pestañas de sabores del día, sabores y precios.
export default function AdminPage() {
  // undefined: comprobando la sesión; null: sin sesión; texto: usuario con sesión.
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>('today');
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [expired, setExpired] = useState(false);

  // Trata un error de la API: si la sesión venció vuelve al login; si no, muestra el mensaje.
  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      setExpired(true);
      setUser(null);
      return;
    }
    setNotice({ kind: 'error', text: (error as Error).message });
  }, []);

  // Carga el catálogo de sabores y la carta.
  const reload = useCallback(async () => {
    const [f, p] = await Promise.all([getFlavors(), getProducts()]);
    setFlavors(f.flavors);
    setCategories(p.categories);
  }, []);

  // Al abrir el panel se pregunta al servidor si hay una sesión vigente.
  useEffect(() => {
    getMe()
      .then((me) => setUser(me.username))
      .catch(() => setUser(null));
  }, []);

  // Con sesión iniciada se cargan los datos.
  useEffect(() => {
    if (user) reload().catch(handleError);
  }, [user, reload, handleError]);

  // Los avisos se ocultan solos a los cuatro segundos.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Ejecuta un cambio, recarga los datos y muestra el resultado.
  const run: Run = async (action, okText) => {
    try {
      await action();
      await reload();
      if (okText) setNotice({ kind: 'ok', text: okText });
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  };

  // Cierra la sesión y vuelve al login.
  async function handleLogout() {
    await logout().catch(() => undefined);
    setExpired(false);
    setNotice(null);
    setUser(null);
  }

  // Registra el inicio de sesión y limpia el aviso de sesión vencida.
  function handleLogin(username: string) {
    setExpired(false);
    setUser(username);
  }

  return (
    <>
      <Background />
      {user === undefined && (
        <p className="py-24 text-center text-sm uppercase tracking-[0.3em] text-mist">Cargando…</p>
      )}
      {user === null && <LoginForm expired={expired} onLogin={handleLogin} />}
      {user && (
        <div className="mx-auto max-w-5xl px-4 pb-16 pt-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="neon-text font-script text-4xl" style={neon(colors.cyan)}>
              Panel
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-mist sm:inline">{user}</span>
              <Link to="/" target="_blank" className="neon-pill bg-black/50 px-4 py-2 font-semibold" style={neon(colors.sky)}>
                Ver menú
              </Link>
              <Button color={colors.red} onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
          </header>

          <nav role="tablist" aria-label="Secciones del panel" className="mt-5 flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                style={neon(colors.magenta)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item.id ? 'neon-pill bg-neon-magenta/20 text-white!' : 'border border-white/20 text-mist'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div aria-live="polite" className="mt-4 min-h-10">
            {notice && (
              <p
                className={`rounded-xl border px-4 py-2 text-sm ${
                  notice.kind === 'ok'
                    ? 'border-neon-lime/60 bg-neon-lime/10 text-neon-lime'
                    : 'border-red-400/60 bg-red-500/10 text-red-200'
                }`}
              >
                {notice.text}
              </p>
            )}
          </div>

          {/* Las tres pestañas permanecen montadas y solo se oculta la inactiva,
              para que cambiar de pestaña no descarte lo que aún no se ha guardado. */}
          <main className="mt-2">
            <div role="tabpanel" hidden={tab !== 'today'}>
              <TodayTab flavors={flavors} run={run} />
            </div>
            <div role="tabpanel" hidden={tab !== 'flavors'}>
              <FlavorsTab flavors={flavors} run={run} />
            </div>
            <div role="tabpanel" hidden={tab !== 'prices'}>
              <PricesTab categories={categories} run={run} />
            </div>
          </main>
        </div>
      )}
    </>
  );
}
