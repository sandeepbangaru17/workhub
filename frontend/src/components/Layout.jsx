import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="app-frame">
      <Navbar />
      <div className="bg-aurora" />
      <div className="bg-mesh" />
      <main className="shell app-main">
        <div className="fade-in">{children}</div>
      </main>
    </div>
  );
}
