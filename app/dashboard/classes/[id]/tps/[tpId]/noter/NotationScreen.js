"use client";

import { useState } from "react";
import { enregistrerEvaluation, marquerNonEvalueClasse } from "./actions";

const COLORS = {
  surface: "#FFFFFF",
  text: "#1C1B1A",
  text2: "#6B6862",
  border: "#E4E1D9",
  accent: "#33506B",
  accentBg: "#E8EEF3",
  green: "#1F7A43",
  greenBg: "#E6F4EA",
  red: "#B23B33",
  redBg: "#FBEAEA",
  grey: "#8A8680",
  greyBg: "#F0EFEC",
};

function cle(questionId, eleveId) {
  return `${questionId}|${eleveId}`;
}

function valeursPossibles(max) {
  const valeurs = [];
  for (let v = 0; v <= Number(max); v += 0.5) {
    valeurs.push(Math.round(v * 10) / 10);
  }
  return valeurs;
}

export default function NotationScreen({ classeId, tpId, questions, eleves, evaluations }) {
  const [mode, setMode] = useState("question");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [eleveIndex, setEleveIndex] = useState(0);

  const [etat, setEtat] = useState(() => {
    const initial = {};
    for (const q of questions) {
      for (const e of eleves) {
        const existant = evaluations.find((ev) => ev.question_id === q.id && ev.eleve_id === e.id);
        initial[cle(q.id, e.id)] = {
          points: existant ? Number(existant.points_obtenus) : 0,
          statut: existant ? existant.statut_competence : "non_evalue",
          saving: false,
        };
      }
    }
    return initial;
  });

  async function sauvegarder(questionId, eleveId, patch) {
    const k = cle(questionId, eleveId);
    const nouvelEtat = { ...etat[k], ...patch, saving: true };
    setEtat((e) => ({ ...e, [k]: nouvelEtat }));

    await enregistrerEvaluation({
      question_id: questionId,
      eleve_id: eleveId,
      points_obtenus: nouvelEtat.points,
      statut_competence: nouvelEtat.statut,
    });

    setEtat((e) => ({ ...e, [k]: { ...e[k], saving: false } }));
  }

  async function marquerTousNonEvalue(question) {
    if (!confirm(`Marquer tous les élèves comme "Non évalué" pour la question ${question.numero} ?`)) return;

    const eleveIds = eleves.map((e) => e.id);
    setEtat((prev) => {
      const copie = { ...prev };
      for (const id of eleveIds) {
        copie[cle(question.id, id)] = { points: 0, statut: "non_evalue", saving: false };
      }
      return copie;
    });

    await marquerNonEvalueClasse({ question_id: question.id, eleve_ids: eleveIds });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <ModeButton
          label="Par question"
          actif={mode === "question"}
          onClick={() => setMode("question")}
        />
        <ModeButton
          label="Par élève"
          actif={mode === "eleve"}
          onClick={() => setMode("eleve")}
        />
        <ModeButton
          label="Vue d'ensemble"
          actif={mode === "apercu"}
          onClick={() => setMode("apercu")}
        />
      </div>

      {mode === "question" ? (
        <ModeQuestion
          questions={questions}
          eleves={eleves}
          questionIndex={questionIndex}
          setQuestionIndex={setQuestionIndex}
          etat={etat}
          setEtat={setEtat}
          sauvegarder={sauvegarder}
          marquerTousNonEvalue={marquerTousNonEvalue}
        />
      ) : mode === "eleve" ? (
        <ModeEleve
          questions={questions}
          eleves={eleves}
          eleveIndex={eleveIndex}
          setEleveIndex={setEleveIndex}
          etat={etat}
          sauvegarder={sauvegarder}
        />
      ) : (
        <ModeApercu questions={questions} eleves={eleves} etat={etat} />
      )}
    </div>
  );
}

function ModeButton({ label, actif, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: actif ? COLORS.accent : COLORS.surface,
        color: actif ? "#fff" : COLORS.text,
        border: `1px solid ${actif ? COLORS.accent : COLORS.border}`,
        borderRadius: 10,
        padding: "9px 8px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ModeQuestion({ questions, eleves, questionIndex, setQuestionIndex, etat, sauvegarder, marquerTousNonEvalue }) {
  const question = questions[questionIndex];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setQuestionIndex(i)}
            style={{
              flexShrink: 0,
              background: i === questionIndex ? COLORS.accent : COLORS.surface,
              color: i === questionIndex ? "#fff" : COLORS.text,
              border: `1px solid ${i === questionIndex ? COLORS.accent : COLORS.border}`,
              borderRadius: 20,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Q{q.numero}
          </button>
        ))}
      </div>

      <div
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          <span>Question {question.numero}</span>
          <span style={{ color: COLORS.text2, fontWeight: 400 }}>/ {question.points_max} pt(s)</span>
        </div>
        <div style={{ fontSize: 14, marginBottom: 6 }}>{question.enonce}</div>
        <div style={{ fontSize: 12, color: COLORS.accent }}>
          {question.sous_competences?.code} — {question.sous_competences?.intitule}
        </div>
      </div>

      <button
        type="button"
        onClick={() => marquerTousNonEvalue(question)}
        style={{
          background: "none",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.grey,
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 12.5,
          cursor: "pointer",
          marginBottom: 14,
        }}
      >
        Marquer toute la classe "Non évalué" pour cette question
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {eleves.map((eleve) => {
          const ligne = etat[cle(question.id, eleve.id)];
          return (
            <div
              key={eleve.id}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {eleve.prenom} {eleve.nom}
                </div>
                {ligne.saving && <span style={{ fontSize: 11, color: COLORS.text2 }}>...</span>}
              </div>

              <LigneNotation
                question={question}
                ligne={ligne}
                onPoints={(points) => sauvegarder(question.id, eleve.id, { points, statut: points > 0 ? (ligne.statut === "non_evalue" ? "acquis" : ligne.statut) : ligne.statut })}
                onStatut={(statut) => sauvegarder(question.id, eleve.id, { statut, points: statut === "non_evalue" ? 0 : ligne.points })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModeEleve({ questions, eleves, eleveIndex, setEleveIndex, etat, sauvegarder }) {
  const eleve = eleves[eleveIndex];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
        {eleves.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setEleveIndex(i)}
            style={{
              flexShrink: 0,
              background: i === eleveIndex ? COLORS.accent : COLORS.surface,
              color: i === eleveIndex ? "#fff" : COLORS.text,
              border: `1px solid ${i === eleveIndex ? COLORS.accent : COLORS.border}`,
              borderRadius: 20,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {e.prenom} {e.nom}
          </button>
        ))}
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        {eleve.prenom} {eleve.nom}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((question) => {
          const ligne = etat[cle(question.id, eleve.id)];
          return (
            <div
              key={question.id}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 13.5, maxWidth: "78%" }}>
                  <span style={{ fontWeight: 700 }}>Q{question.numero}. </span>
                  {question.enonce}
                  <div style={{ fontSize: 11.5, color: COLORS.accent, marginTop: 2 }}>
                    {question.sous_competences?.code}
                  </div>
                </div>
                {ligne.saving && <span style={{ fontSize: 11, color: COLORS.text2 }}>...</span>}
              </div>

              <LigneNotation
                question={question}
                ligne={ligne}
                onPoints={(points) => sauvegarder(question.id, eleve.id, { points, statut: points > 0 ? (ligne.statut === "non_evalue" ? "acquis" : ligne.statut) : ligne.statut })}
                onStatut={(statut) => sauvegarder(question.id, eleve.id, { statut, points: statut === "non_evalue" ? 0 : ligne.points })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUT_APERCU = {
  acquis: { symbole: "✓", couleur: COLORS.green, fond: COLORS.greenBg },
  non_acquis: { symbole: "✕", couleur: COLORS.red, fond: COLORS.redBg },
  non_evalue: { symbole: "—", couleur: COLORS.grey, fond: COLORS.greyBg },
};

function ModeApercu({ questions, eleves, etat }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11.5, color: COLORS.text2 }}>
        <div style={{ color: COLORS.grey }}>— Non évalué</div>
        <div style={{ color: COLORS.red }}>✕ Non acquis</div>
        <div style={{ color: COLORS.green }}>✓ Acquis</div>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
        <div style={{ display: "inline-block", minWidth: "100%" }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                position: "sticky",
                left: 0,
                zIndex: 2,
                width: 120,
                flexShrink: 0,
                padding: "10px 8px",
                background: COLORS.accent,
                color: "#fff",
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              Élève
            </div>
            {questions.map((q) => (
              <div
                key={q.id}
                style={{
                  width: 52,
                  flexShrink: 0,
                  padding: "10px 4px",
                  background: COLORS.accent,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: "center",
                  borderLeft: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                Q{q.numero}
              </div>
            ))}
          </div>

          {eleves.map((eleve) => (
            <div key={eleve.id} style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
              <div
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                  width: 120,
                  flexShrink: 0,
                  padding: "10px 8px",
                  background: COLORS.surface,
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderRight: `1px solid ${COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {eleve.prenom} {eleve.nom}
              </div>
              {questions.map((q) => {
                const ligne = etat[cle(q.id, eleve.id)];
                const st = STATUT_APERCU[ligne?.statut] ?? STATUT_APERCU.non_evalue;
                return (
                  <div
                    key={q.id}
                    style={{
                      width: 52,
                      flexShrink: 0,
                      padding: "10px 4px",
                      textAlign: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      background: st.fond,
                      color: st.couleur,
                      borderLeft: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {st.symbole}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LigneNotation({ question, ligne, onPoints, onStatut }) {
  const nonEvalue = ligne.statut === "non_evalue";
  const valeurs = valeursPossibles(question.points_max);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
        {valeurs.map((v) => {
          const actif = !nonEvalue && ligne.points === v;
          return (
            <button
              key={v}
              type="button"
              disabled={nonEvalue}
              onClick={() => onPoints(v)}
              style={{
                flexShrink: 0,
                minWidth: 34,
                background: actif ? COLORS.accentBg : "none",
                color: nonEvalue ? COLORS.grey : actif ? COLORS.accent : COLORS.text,
                border: `1px solid ${actif ? COLORS.accent : COLORS.border}`,
                borderRadius: 8,
                padding: "6px 4px",
                fontSize: 13,
                fontWeight: actif ? 700 : 500,
                cursor: nonEvalue ? "default" : "pointer",
                opacity: nonEvalue ? 0.5 : 1,
              }}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <StatutButton
          label="Acquis"
          actif={ligne.statut === "acquis"}
          couleurActif={COLORS.green}
          couleurFond={COLORS.greenBg}
          onClick={() => onStatut("acquis")}
        />
        <StatutButton
          label="Non acquis"
          actif={ligne.statut === "non_acquis"}
          couleurActif={COLORS.red}
          couleurFond={COLORS.redBg}
          onClick={() => onStatut("non_acquis")}
        />
        <StatutButton
          label="Non évalué"
          actif={nonEvalue}
          couleurActif={COLORS.grey}
          couleurFond={COLORS.greyBg}
          onClick={() => onStatut("non_evalue")}
        />
      </div>
    </div>
  );
}

function StatutButton({ label, actif, couleurActif, couleurFond, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: actif ? couleurFond : "none",
        color: actif ? couleurActif : "#8A8680",
        border: `1px solid ${actif ? couleurActif : "#E4E1D9"}`,
        borderRadius: 8,
        padding: "7px 4px",
        fontSize: 12,
        fontWeight: actif ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
