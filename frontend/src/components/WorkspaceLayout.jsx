export default function WorkspaceLayout({ roleLabel, title, subtitle, left, children }) {
  return (
    <section className="workspace-shell">
      <aside className="workspace-side panel">
        <p className="eyebrow">{roleLabel}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {left}
      </aside>
      <div className="workspace-main">{children}</div>
    </section>
  );
}
