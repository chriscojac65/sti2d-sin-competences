"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importerTP } from "./actions";

const COLORS = {
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  red: "#B23B33",
  redBg: "#FBEAEA",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
};

export default function ImportTpForm({ classeId }) {
  const router = useRouter();
  const formRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [erreursLignes, setErreursLignes] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErreursLignes(null);
    setLoading(true);
    const fd = new FormData(formRef.current);
    fd.set("classe_id", classeId);
    const result = await importerTP(fd);
    setLoading(false);

    if (result?.aborted) {
      setErreursLignes(result.erreurs);
      return;
    }
    if (result?.error) {
      setError(result.error);
      return;
    }

    formRef.current.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" style={btnPrimary} onClick={() => setOpen(true)}>
        + Importer un TP
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 18,
        maxWidth: 480,
        marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 12.5, color: COLORS.text2, margin: 0, lineHeight: 1.5 }}>
        Fichier Excel (.xlsx) avec une ligne d'en-tête et les colonnes :{" "}
        <b>numero</b>, <b>enonce</b>, <b>points_max</b>, <b>competence</b> (code de la
        sous-compétence, ex. <code>C2-3</code>).
      </p>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Nom du TP
        <input name="nom" required placeholder="ex. TP4 - Canne technologique" style={inputStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Type
        <select name="type" defaultValue="TP" style={inputStyle}>
          <option value="TP">TP (formatif)</option>
          <option value="Evaluation">Évaluation (sommative)</option>
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Date (optionnelle)
        <input name="date" type="date" style={inputStyle} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Fichier de barème (.xlsx)
        <input type="file" name="fichier" accept=".xlsx,.xls" required style={{ fontSize: 13 }} />
      </label>

      {error && (
        <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {erreursLignes && (
        <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, lineHeight: 1.5 }}>
          Le fichier contient des erreurs, rien n'a été importé :
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {erreursLignes.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={loading} style={btnPrimary}>
          {loading ? "Import..." : "Importer"}
        </button>
        <button
          type="button"
          style={btnSecondary}
          onClick={() => {
            setOpen(false);
            setError("");
            setErreursLignes(null);
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

const inputStyle = {
  border: "1px solid " + COLORS.border,
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "inherit",
};

const btnPrimary = {
  background: COLORS.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondary = {
  background: "none",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 13,
  cursor: "pointer",
};
