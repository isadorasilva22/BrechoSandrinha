// ============================================================
// CATÁLOGO PÚBLICO — lista peças do Firestore, aplica filtros,
// exibe modal com carrossel de fotos e compartilhamento.
// ============================================================

import { db } from "./firebase.js";
import {
    collection,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const INSTAGRAM_HANDLE = "brechosandrinha2026"; // @ do Instagram, sem o "@"

// ------------------------------------------------------------
// ELEMENTOS
// ------------------------------------------------------------
const campoBusca = document.getElementById("busca");
const filtroCategorias = document.getElementById("filtroCategorias");
const filtroCores = document.getElementById("filtroCores");
const filtroComEtiqueta = document.getElementById("filtroComEtiqueta");
const filtroOcultarEsgotados = document.getElementById("filtroOcultarEsgotados");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");
const contador = document.getElementById("contador");
const grid = document.getElementById("grid");

const modal = document.getElementById("modal");
const fecharModalBtn = document.getElementById("fecharModal");
const carrosselImagens = document.getElementById("carrosselImagens");
const carrosselIndicadores = document.getElementById("carrosselIndicadores");
const btnCarrosselAnterior = document.getElementById("carrosselAnterior");
const btnCarrosselProximo = document.getElementById("carrosselProximo");
const modalEsgotadoBanner = document.getElementById("modalEsgotadoBanner");
const modalTitulo = document.getElementById("modalTitulo");
const modalPreco = document.getElementById("modalPreco");
const modalBadges = document.getElementById("modalBadges");
const modalDescricao = document.getElementById("modalDescricao");
const modalCores = document.getElementById("modalCores");
const btnCompartilharInstagram = document.getElementById("btnCompartilharInstagram");
const btnCopiarLink = document.getElementById("btnCopiarLink");
const modalAvisoCopia = document.getElementById("modalAvisoCopia");

// ------------------------------------------------------------
// ESTADO
// ------------------------------------------------------------
let todasPecas = [];
let categorias = [];
let carregando = true;
let indiceImagemAtual = 0;
let pecaAberta = null;

// ============================================================
// CATEGORIAS (para montar o filtro dinamicamente)
// ============================================================
onSnapshot(query(collection(db, "categorias"), orderBy("nome")), (snapshot) => {
    categorias = snapshot.docs.map((documento) => documento.data().nome);
    renderizarFiltroCategorias();
});

function renderizarFiltroCategorias() {
    const selecionadas = obterValoresMarcados(filtroCategorias, "filtroCategoria");
    filtroCategorias.innerHTML = categorias.map((nome) => `
        <label class="filtro-check">
            <input type="checkbox" class="filtroCategoria" value="${escapeAttr(nome)}" ${selecionadas.includes(nome) ? "checked" : ""}>
            ${escapeHtml(nome)}
        </label>
    `).join("") || `<span class="subtitulo">Nenhuma categoria cadastrada.</span>`;

    filtroCategorias.querySelectorAll(".filtroCategoria").forEach((checkbox) => {
        checkbox.addEventListener("change", aplicarFiltros);
    });
}

// ============================================================
// PEÇAS
// ============================================================
onSnapshot(query(collection(db, "pecas"), orderBy("criadoEm", "desc")), (snapshot) => {
    todasPecas = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
    carregando = false;
    renderizarFiltroCores();
    aplicarFiltros();
    abrirPecaDaUrlSeExistir();
});

function renderizarFiltroCores() {
    const coresUnicas = [...new Set(todasPecas.flatMap((peca) => peca.cores || []))].sort();
    const selecionadas = obterValoresMarcados(filtroCores, "filtroCor");

    filtroCores.innerHTML = coresUnicas.map((cor) => `
        <label class="filtro-check">
            <input type="checkbox" class="filtroCor" value="${escapeAttr(cor)}" ${selecionadas.includes(cor) ? "checked" : ""}>
            ${escapeHtml(cor)}
        </label>
    `).join("") || `<span class="subtitulo">Nenhuma cor cadastrada.</span>`;

    filtroCores.querySelectorAll(".filtroCor").forEach((checkbox) => {
        checkbox.addEventListener("change", aplicarFiltros);
    });
}

function obterValoresMarcados(container, classe) {
    return Array.from(container.querySelectorAll(`.${classe}:checked`)).map((checkbox) => checkbox.value);
}

// ============================================================
// FILTROS
// ============================================================
function aplicarFiltros() {
    const termoBusca = normalizarTexto(campoBusca.value);
    const categoriasSelecionadas = obterValoresMarcados(filtroCategorias, "filtroCategoria");
    const coresSelecionadas = obterValoresMarcados(filtroCores, "filtroCor");
    const niveisSelecionados = Array.from(document.querySelectorAll(".filtroNivelUso:checked")).map((checkbox) => checkbox.value);
    const somenteComEtiqueta = filtroComEtiqueta.checked;
    const ocultarEsgotados = filtroOcultarEsgotados.checked;

    const filtradas = todasPecas.filter((peca) => {
        if (termoBusca && !normalizarTexto(peca.titulo).includes(termoBusca)) return false;
        if (categoriasSelecionadas.length && !categoriasSelecionadas.includes(peca.categoria)) return false;
        if (niveisSelecionados.length && !niveisSelecionados.includes(peca.nivelUso)) return false;
        if (coresSelecionadas.length && !(peca.cores || []).some((cor) => coresSelecionadas.includes(cor))) return false;
        if (somenteComEtiqueta && !peca.comEtiqueta) return false;
        if (ocultarEsgotados && peca.esgotado) return false;
        return true;
    });

    renderizarGrid(filtradas);
}

[campoBusca].forEach((elemento) => elemento.addEventListener("input", aplicarFiltros));
[filtroComEtiqueta, filtroOcultarEsgotados].forEach((elemento) => elemento.addEventListener("change", aplicarFiltros));
document.querySelectorAll(".filtroNivelUso").forEach((checkbox) => checkbox.addEventListener("change", aplicarFiltros));

btnLimparFiltros.addEventListener("click", () => {
    campoBusca.value = "";
    filtroComEtiqueta.checked = false;
    filtroOcultarEsgotados.checked = false;
    document.querySelectorAll(".filtroNivelUso, .filtroCategoria, .filtroCor").forEach((checkbox) => { checkbox.checked = false; });
    aplicarFiltros();
});

// ============================================================
// GRID
// ============================================================
function renderizarGrid(lista) {
    if (carregando) {
        grid.innerHTML = Array.from({ length: 8 }).map(() => `<div class="skeleton skeleton-card"></div>`).join("");
        contador.textContent = "Carregando peças...";
        return;
    }

    contador.textContent = `${lista.length} peça${lista.length === 1 ? "" : "s"} encontrada${lista.length === 1 ? "" : "s"}`;

    grid.innerHTML = lista.map((peca) => `
        <article class="card-peca" data-id="${peca.id}">
            <div class="card-thumb-wrap">
                <img src="${peca.imagens?.[0]?.url || ""}" alt="${escapeAttr(peca.titulo)}">
                <div class="card-badges">
                    ${peca.esgotado ? `<span class="badge badge-esgotado">Esgotado</span>` : ""}
                </div>
            </div>
            <div class="card-info">
                <h3>${escapeHtml(peca.titulo)}</h3>
                <p class="card-preco">${formatarPreco(peca.preco)}</p>
                <p class="card-categoria">${escapeHtml(peca.categoria || "")}</p>
            </div>
        </article>
    `).join("") || `<p class="subtitulo">Nenhuma peça encontrada com esses filtros.</p>`;

    grid.querySelectorAll(".card-peca").forEach((card) => {
        card.addEventListener("click", () => abrirModal(card.dataset.id));
    });
}

// ============================================================
// MODAL + CARROSSEL
// ============================================================
function abrirModal(id) {
    const peca = todasPecas.find((item) => item.id === id);
    if (!peca) return;

    pecaAberta = peca;
    indiceImagemAtual = 0;

    modalTitulo.textContent = peca.titulo;
    modalPreco.textContent = formatarPreco(peca.preco);
    modalDescricao.textContent = peca.descricao || "";
    modalEsgotadoBanner.classList.toggle("oculto", !peca.esgotado);

    modalBadges.innerHTML = `
        <span class="badge">${escapeHtml(peca.categoria || "")}</span>
        <span class="badge badge-condicao">${rotuloNivelUso(peca.nivelUso)}</span>
        ${peca.comEtiqueta ? `<span class="badge badge-etiqueta">Com etiqueta</span>` : ""}
    `;

    modalCores.innerHTML = (peca.cores || []).map((cor) => `<span class="chip">${escapeHtml(cor)}</span>`).join("");

    renderizarCarrossel(peca.imagens || []);
    atualizarLinksCompartilhar(peca);

    modalAvisoCopia.classList.add("oculto");
    modal.classList.remove("oculto");
    history.replaceState(null, "", `?peca=${peca.id}`);
}

function fecharModal() {
    modal.classList.add("oculto");
    pecaAberta = null;
    history.replaceState(null, "", location.pathname);
}

fecharModalBtn.addEventListener("click", fecharModal);
modal.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharModal();
});
document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !modal.classList.contains("oculto")) fecharModal();
});

function renderizarCarrossel(imagens) {
    carrosselImagens.innerHTML = imagens.map((imagem) => `<img src="${imagem.url}" alt="">`).join("")
        || `<img src="" alt="Sem foto disponível">`;

    carrosselIndicadores.innerHTML = imagens.map((_, indice) => `<span data-indice="${indice}"></span>`).join("");

    carrosselIndicadores.querySelectorAll("span").forEach((ponto) => {
        ponto.addEventListener("click", () => irParaImagem(Number(ponto.dataset.indice)));
    });

    const mostraSetas = imagens.length > 1;
    btnCarrosselAnterior.classList.toggle("oculto", !mostraSetas);
    btnCarrosselProximo.classList.toggle("oculto", !mostraSetas);

    irParaImagem(0);
}

function irParaImagem(indice) {
    const total = carrosselImagens.children.length;
    if (total === 0) return;

    indiceImagemAtual = (indice + total) % total;
    carrosselImagens.scrollTo({ left: carrosselImagens.clientWidth * indiceImagemAtual, behavior: "smooth" });

    carrosselIndicadores.querySelectorAll("span").forEach((ponto, i) => {
        ponto.classList.toggle("ativo", i === indiceImagemAtual);
    });
}

btnCarrosselAnterior.addEventListener("click", () => irParaImagem(indiceImagemAtual - 1));
btnCarrosselProximo.addEventListener("click", () => irParaImagem(indiceImagemAtual + 1));

function rotuloNivelUso(nivel) {
    return { novo: "Novo", seminovo: "Seminovo", usado: "Usado" }[nivel] || nivel || "";
}

function formatarPreco(valor) {
    return typeof valor === "number"
        ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "Consulte o valor";
}

// ============================================================
// COMPARTILHAR
// ============================================================
function atualizarLinksCompartilhar(peca) {
    const link = `${location.origin}${location.pathname}?peca=${peca.id}`;
    const mensagem = `Olá, tudo bem? Essa peça ainda está disponível: ${peca.titulo} — ${link}`;

    btnCompartilharInstagram.onclick = () => compartilharNoInstagram(peca, mensagem);

    btnCopiarLink.onclick = () => {
        // Sem número de WhatsApp no código: a pessoa copia o link e compartilha
        // por onde quiser (WhatsApp, SMS, etc.).
        copiarParaAreaDeTransferencia(link, "Link copiado! Cole numa conversa do WhatsApp (ou onde quiser).");
    };
}

async function compartilharNoInstagram(peca, mensagem) {
    const urlImagem = peca.imagens?.[0]?.url;

    // No celular: tenta usar o menu nativo de compartilhamento do aparelho (o mesmo
    // que aparece ao compartilhar uma foto), já com a imagem e a mensagem juntas —
    // a pessoa escolhe "Instagram" ali. É o mais próximo que a Instagram permite,
    // já que não existe uma API pública pra pré-preencher o Direct por link.
    if (urlImagem && navigator.canShare) {
        try {
            const resposta = await fetch(urlImagem);
            const blob = await resposta.blob();
            const arquivo = new File([blob], "peca.jpg", { type: blob.type || "image/jpeg" });

            if (navigator.canShare({ files: [arquivo] })) {
                await navigator.share({ files: [arquivo], text: mensagem, title: peca.titulo });
                return;
            }
        } catch {
            // Usuário cancelou o compartilhamento ou o navegador falhou — segue pro fallback abaixo.
        }
    }

    // Fallback (computador, ou navegador sem suporte a compartilhar arquivos):
    // abre a conversa do Instagram e copia a mensagem — a foto precisa ser enviada
    // manualmente, já que a Instagram não aceita anexo por link.
    window.open(`https://ig.me/m/${INSTAGRAM_HANDLE}`, "_blank", "noopener");
    copiarParaAreaDeTransferencia(mensagem, "Mensagem copiada! Cole na conversa do Instagram (a foto precisa ser enviada manualmente).");
}

function copiarParaAreaDeTransferencia(texto, mensagem) {
    navigator.clipboard?.writeText(texto).then(() => {
        modalAvisoCopia.textContent = mensagem;
        modalAvisoCopia.classList.remove("oculto");
    }).catch(() => {});
}

function abrirPecaDaUrlSeExistir() {
    const idNaUrl = new URLSearchParams(location.search).get("peca");
    if (idNaUrl && todasPecas.some((peca) => peca.id === idNaUrl)) {
        abrirModal(idNaUrl);
    }
}

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function normalizarTexto(texto = "") {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function escapeHtml(texto = "") {
    return texto.replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[caractere]));
}

function escapeAttr(texto = "") {
    return escapeHtml(texto);
}

renderizarGrid([]);
