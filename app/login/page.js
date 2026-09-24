"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { emailDepuisIdentifiant } from "@/lib/eleve-email";

const COLORS = {
  bg: "#F7F5F0",
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  red: "#B23B33",
  redBg: "#FBEAEA",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState("connexion");
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    const email = identifiant.includes("@") ? identifiant.trim() : emailDepuisIdentifiant(identifiant);

    if (mode === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Identifiant ou mot de passe incorrect."
            : error.message
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setInfo(
        "Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter."
      );
      setMode("connexion");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: "32px 28px",
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.text2, marginBottom: 4 }}>
          Terminale STI2D SIN
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px" }}>
          {mode === "connexion" ? "Connexion" : "Créer mon compte professeur"}
        </h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {mode === "connexion" ? "Identifiant" : "Adresse e-mail"}
            <input
              type="text"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              style={inputStyle}
              placeholder={
                mode === "connexion"
                  ? "identifiant élève ou email professeur"
                  : "prenom.nom@exemple.fr"
              }
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            Mot de passe
            <input
              type="password"
              required
              minLength={mode === "connexion" ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder={mode === "connexion" ? "" : "8 caractères minimum"}
            />
          </label>

          {error && (
            <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ background: COLORS.greenBg, color: COLORS.green, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: COLORS.accent,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : mode === "connexion" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "connexion" ? "creation" : "connexion");
            setError("");
            setInfo("");
          }}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            color: COLORS.accent,
            fontSize: 12.5,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {mode === "connexion"
            ? "Première connexion en tant que professeur ? Créer mon compte"
            : "J'ai déjà un compte, me connecter"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid " + COLORS.border,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
};
