// ============================================================
// HOME (index.html) — carrega as peças marcadas como "Destaque"
// no painel administrativo e monta a vitrine da página inicial.
// ============================================================

import { db } from "./firebase.js";
import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const LIMITE_DESTAQUES = 6;

const gridDestaques = document.getElementById("gridDestaques");

gridDestaques.innerHTML = Array.from({ length: 3 }).map(() => `<div class="skeleton skeleton-card"></div>`).join("");

const destaquesQuery = query(collection(db, "pecas"), where("destaque", "==", true));

onSnapshot(destaquesQuery, (snapshot) => {
    const destaques = snapshot.docs
        .map((documento) => ({ id: documento.id, ...documento.data() }))
        .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0))
        .slice(0, LIMITE_DESTAQUES);

    renderizarDestaques(destaques);
});

function renderizarDestaques(destaques) {
    if (destaques.length === 0) {
        gridDestaques.innerHTML = `<p class="subtitulo">Nenhuma peça em destaque no momento. Escolha as peças na Administração.</p>`;
        return;
    }

    gridDestaques.innerHTML = destaques.map((peca) => `
        <article class="card-destaque">
            <div class="card-destaque-thumb">
                <img src="${peca.imagens?.[0]?.url || ""}" alt="${escapeAttr(peca.titulo)}">
                <span class="card-destaque-condicao card-destaque-condicao--${peca.nivelUso || "novo"}">${rotuloNivelUso(peca.nivelUso)}</span>
            </div>
            <div class="card-destaque-info">
                <h3>${escapeHtml(peca.titulo)}</h3>
                <p class="card-destaque-preco">${formatarPreco(peca.preco)}</p>
                <a href="catalogo.html?peca=${peca.id}" class="btn btn-outline btn-sm">Ver peça <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>
    `).join("");
}

function rotuloNivelUso(nivel) {
    return { novo: "Novo", seminovo: "Seminovo", usado: "Usado" }[nivel] || nivel || "";
}

function formatarPreco(valor) {
    return typeof valor === "number"
        ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "Consulte o valor";
}

function escapeHtml(texto = "") {
    return texto.replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[caractere]));
}

function escapeAttr(texto = "") {
    return escapeHtml(texto);
}
