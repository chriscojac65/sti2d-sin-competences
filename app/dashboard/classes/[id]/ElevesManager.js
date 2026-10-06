"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ajouterEleve, importerElevesExcel, modifierEleve, supprimerEleve, reinitialiserMotDePasse } from "./actions";

const COLORS = {
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

export default function ElevesManager({ classeId, eleves }) {
  const router = useRouter();
  const [tab, setTab] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pwdId, setPwdId] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Élèves ({eleves.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary} onClick={() => setTab(tab === "form" ? null : "form")}>
            + Un élève
          </button>
          <button style={btnSecondary} onClick={() => setTab(tab === "import" ? null : "import")}>
            Importer un fichier
          </button>
        </div>
      </div>

      {tab === "form" && (
        <AjoutForm classeId={classeId} onDone={() => { setTab(null); router.refresh(); }} />
      )}
      {tab === "import" && (
        <ImportForm classeId={classeId} onDone={() => { setTab(null); router.refresh(); }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {eleves.length === 0 && (
          <p style={{ fontSize: 13.5, color: COLORS.text2 }}>Aucun élève dans cette classe pour l'instant.</p>
        )}
        {eleves.map((e) =>
          editingId === e.id ? (
            <EditRow key={e.id} eleve={e} classeId={classeId} onDone={() => { setEditingId(null); router.refresh(); }} />
          ) : pwdId === e.id ? (
            <PasswordRow key={e.id} eleve={e} onDone={() => setPwdId(null)} />
          ) : (
            <Row
              key={e.id}
              eleve={e}
              onEdit={() => setEditingId(e.id)}
              onPassword={() => setPwdId(e.id)}
              onDelete={async () => {
                if (!confirm(`Supprimer ${e.prenom} ${e.nom} ? Son compte de connexion sera aussi supprimé.`)) return;
                const fd = new FormData();
                fd.set("id", e.id);
                fd.set("classe_id", classeId);
                await supprimerEleve(fd);
                router.refresh();
              }}
            />
          )
        )}
      </div>
    </div>
  );
}

function Row({ eleve, onEdit, onPassword, onDelete }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {eleve.prenom} {eleve.nom}
        </div>
        <div style={{ fontSize: 12, color: COLORS.text2 }}>
          {eleve.numero_valise ? `Valise ${eleve.numero_valise} · ` : ""}
          identifiant : {eleve.identifiant}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={btnGhost} onClick={onEdit}>
          Modifier
        </button>
        <button style={btnGhost} onClick={onPassword}>
          Mot de passe
        </button>
        <button style={{ ...btnGhost, color: COLORS.red }} onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

function PasswordRow({ eleve, onDone }) {
  const [mdp, setMdp] = useState("");
  const [error, setError] = useState("");
  const [fait, setFait] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.set("id", eleve.id);
    fd.set("mot_de_passe", mdp);
    try {
      const result = await reinitialiserMotDePasse(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setFait(mdp);
    } catch (err) {
      setError("Échec de l'enregistrement : " + (err?.message || "erreur inconnue") + ". Rechargez la page (Ctrl+F5) et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.accent}`,
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>
        Nouveau mot de passe — {eleve.prenom} {eleve.nom}{" "}
        <span style={{ fontWeight: 400, color: COLORS.text2 }}>(identifiant : {eleve.identifiant})</span>
      </div>
      {fait ? (
        <>
          <div style={{ background: COLORS.greenBg, color: COLORS.green, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
            Mot de passe modifié. Nouveau mot de passe : <b style={{ fontFamily: "monospace", fontSize: 14 }}>{fait}</b>
          </div>
          <div>
            <button type="button" style={btnGhost} onClick={onDone}>
              Fermer
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, flex: 1, minWidth: 180 }}>
            Mot de passe (8 caractères minimum)
            <input
              value={mdp}
              onChange={(ev) => setMdp(ev.target.value)}
              required
              style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontFamily: "monospace" }}
            />
          </label>
          <button type="submit" disabled={loading || mdp.length < 8} style={btnPrimarySmall}>
            {loading ? "..." : "Enregistrer"}
          </button>
          <button type="button" style={btnGhost} onClick={onDone}>
            Annuler
          </button>
          {error && <div style={{ color: COLORS.red, fontSize: 12, width: "100%" }}>{error}</div>}
        </form>
      )}
    </div>
  );
}

function EditRow({ eleve, classeId, onDone }) {
  const formRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(formRef.current);
    fd.set("id", eleve.id);
    fd.set("classe_id", classeId);
    const result = await modifierEleve(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        flexWrap: "wrap",
        background: COLORS.surface,
        border: `1px solid ${COLORS.accent}`,
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <Field label="Prénom" name="prenom" defaultValue={eleve.prenom} />
      <Field label="Nom" name="nom" defaultValue={eleve.nom} />
      <Field label="N° valise" name="numero_valise" defaultValue={eleve.numero_valise || ""} />
      {error && <div style={{ color: COLORS.red, fontSize: 12 }}>{error}</div>}
      <button type="submit" disabled={loading} style={btnPrimarySmall}>
        {loading ? "..." : "Enregistrer"}
      </button>
      <button type="button" style={btnGhost} onClick={onDone}>
        Annuler
      </button>
    </form>
  );
}

function AjoutForm({ classeId, onDone }) {
  const formRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(formRef.current);
    fd.set("classe_id", classeId);
    const result = await ajouterEleve(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    formRef.current.reset();
    onDone();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        maxWidth: 460,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <Field label="Prénom" name="prenom" required />
        <Field label="Nom" name="nom" required />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Field label="N° valise" name="numero_valise" />
        <Field label="Identifiant" name="identifiant" required />
      </div>
      <Field label="Mot de passe" name="mot_de_passe" type="text" required />

      {error && (
        <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={loading} style={btnPrimarySmall}>
          {loading ? "Ajout..." : "Ajouter l'élève"}
        </button>
        <button type="button" style={btnGhost} onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function ImportForm({ classeId, onDone }) {
  const formRef = useRef(null);
  const [error, setError] = useState("");
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setRapport(null);
    setLoading(true);
    const fd = new FormData(formRef.current);
    fd.set("classe_id", classeId);
    const result = await importerElevesExcel(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setRapport(result);
    if (result.erreurs.length === 0) {
      formRef.current.reset();
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        maxWidth: 520,
      }}
    >
      <p style={{ fontSize: 12.5, color: COLORS.text2, margin: "0 0 10px", lineHeight: 1.5 }}>
        Fichier Excel (.xlsx) avec une ligne d'en-tête et les colonnes :{" "}
        <b>nom</b>, <b>prenom</b>, <b>numero_valise</b> (optionnel), <b>identifiant</b>,{" "}
        <b>mot_de_passe</b>.
      </p>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="file" name="fichier" accept=".xlsx,.xls" required style={{ fontSize: 13 }} />

        {error && (
          <div style={{ background: COLORS.redBg, color: COLORS.red, borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
            {error}
          </div>
        )}

        {rapport && (
          <div
            style={{
              background: rapport.erreurs.length ? COLORS.redBg : COLORS.greenBg,
              color: rapport.erreurs.length ? COLORS.red : COLORS.green,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {rapport.nbOk} élève(s) importé(s) avec succès.
            {rapport.erreurs.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {rapport.erreurs.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading} style={btnPrimarySmall}>
            {loading ? "Import..." : "Importer"}
          </button>
          <button type="button" style={btnGhost} onClick={onDone}>
            Fermer
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue, required, type = "text" }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, flex: 1 }}>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 13.5,
          fontFamily: "inherit",
        }}
      />
    </label>
  );
}

const btnSecondary = {
  background: "none",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost = {
  background: "none",
  border: "none",
  color: COLORS.accent,
  fontSize: 12.5,
  cursor: "pointer",
  padding: "6px 8px",
};

const btnPrimarySmall = {
  background: COLORS.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 16px",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
};
