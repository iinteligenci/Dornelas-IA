import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#07101f",
      color: "#edf3ff",
      fontFamily: "system-ui, sans-serif"
    }}>
      <section style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
        <div style={{
          width: "64px", height: "64px", margin: "0 auto 18px",
          borderRadius: "18px", display: "grid", placeItems: "center",
          background: "#1458c8", fontSize: "30px", fontWeight: 800
        }}>D</div>
        <h1 style={{ margin: "0 0 8px", fontSize: "30px" }}>Dornelas</h1>
        <p style={{ margin: "0 0 26px", color: "#9aacc2", lineHeight: 1.6 }}>
          Defumados artesanais
        </p>
        <a
          href="https://iinteligenci.github.io/Site-dornelas/"
          style={{
            display: "block", padding: "15px 18px", borderRadius: "10px",
            background: "#1769e0", color: "#fff", textDecoration: "none",
            fontWeight: 700
          }}
        >
          Acessar site de vendas
        </a>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
