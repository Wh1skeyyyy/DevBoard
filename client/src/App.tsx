function App() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-16">
        <section className="w-full max-w-2xl rounded-[2rem] border border-line bg-panel p-8 shadow-card sm:p-12">
          <div className="mb-10 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-sm font-black text-white shadow-accent">
              DB
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">DevBoard</p>
              <p className="text-sm text-muted">Developer command center</p>
            </div>
          </div>

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent">
            Client ready
          </p>
          <h1 className="max-w-xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">
            Your projects are about to get a proper workspace.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted">
            The React and Tailwind foundation is running with a development
            proxy to the DevBoard API.
          </p>
        </section>
      </div>
    </main>
  );
}

export default App;
