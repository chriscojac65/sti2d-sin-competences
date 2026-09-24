"use client";

import { useRouter } from "next/navigation";
import { supprimerTP } from "../actions";

export default function SupprimerTpButton({ tpId, classeId }) {
  const router = useRouter();

  return (
    <button
      type="button"
      style={{
        background: "none",
        border: "1px solid #E4E1D9",
        color: "#B23B33",
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 12.5,
        cursor: "pointer",
      }}
      onClick={async () => {
        if (!confirm("Supprimer ce TP et toutes ses questions ? Cette action est irréversible.")) return;
        const fd = new FormData();
        fd.set("id", tpId);
        fd.set("classe_id", classeId);
        await supprimerTP(fd);
        router.push(`/dashboard/classes/${classeId}/tps`);
        router.refresh();
      }}
    >
      Supprimer le TP
    </button>
  );
}
