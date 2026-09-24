"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { creerClasse } from "./actions";

const COLORS = {
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  red: "#B23B33",
  redBg: "#FBEAEA",
};

export default function NouvelleClasseForm({ referentiels }) {
  const router = useRouter();
  const formRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(formRef.current);
    const result = await creerClasse(formData);
    setLoading(false);
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: COLORS.accent,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "10px 18px",
          fontWeight: 600,
          fontSize: 13.5,
          cursor: "pointer",
        }}
      >
        + Nouvelle classe
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
        maxWidth: 420,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Nom de la classe
        <input
          name="nom"
          required
          placeholder="ex. Term. STI2D SIN"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Année scolaire
        <input
          name="annee_scolaire"
          required
          placeholder="ex. 2026-2027"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
        Référentiel de compétences
        <select name="referentiel_id" required style={inputStyle}>
          {referentiels.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: COLORS.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 16px",
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Création..." : "Créer la classe"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          style={{
            background: "none",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 13,
            cursor: "pointer",
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
