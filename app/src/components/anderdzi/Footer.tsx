const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2H21l-6.52 7.45L22 22h-6.797l-4.77-6.231L4.8 22H2.04l6.974-7.97L2 2h6.914l4.31 5.7L18.244 2zm-1.19 18h1.652L7.05 4H5.27l11.784 16z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.18c0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);

export function Footer() {
  return (
    <footer className="flex w-full flex-col items-center gap-3 py-6">
      <div className="flex items-center gap-2">
        <a
          href="https://x.com/anderdzi"
          target="_blank"
          rel="noreferrer"
          aria-label="X"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:text-[var(--accent)]"
        >
          <XIcon />
        </a>
        <a
          href="https://github.com/sw10pa/anderdzi"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          className="flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-[var(--surface-2)] text-[var(--text)] transition-colors hover:text-[var(--accent)]"
        >
          <GitHubIcon />
        </a>
      </div>
      <div className="text-[11px] text-[var(--text-muted)]">
        &copy; {new Date().getFullYear()} Anderdzi. All rights reserved.
      </div>
    </footer>
  );
}
