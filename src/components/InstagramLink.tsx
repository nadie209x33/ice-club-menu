import { colors, neon } from './theme';

// Botón en forma de píldora de neón que abre el Instagram del negocio.
export default function InstagramLink() {
  return (
    <a
      href="https://www.instagram.com/iceclubdeca/"
      target="_blank"
      rel="noopener noreferrer"
      className="neon-pill inline-flex items-center gap-2.5 bg-black/50 px-6 py-3 text-base font-semibold tracking-wide transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-magenta"
      style={neon(colors.magenta)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
      </svg>
      @iceclubdeca
    </a>
  );
}
