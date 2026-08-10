// ============================================================
// ADMIN — CRUD de categorias e de peças do catálogo.
// Requer login (ver auth.js) para as escritas serem aceitas
// pelas regras de segurança do Firestore.
// ============================================================

import { db } from "./firebase.js";
import { uploadImagem, removerImagem } from "./cloudinary.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// ------------------------------------------------------------
// ELEMENTOS
// ------------------------------------------------------------
const formCategoria = document.getElementById("formCategoria");
const novaCategoria = document.getElementById("novaCategoria");
const listaCategorias = document.getElementById("listaCategorias");
const selectCategoria = document.getElementById("categoria");

const formPeca = document.getElementById("formPeca");
const tituloForm = document.getElementById("tituloForm");
const campoTitulo = document.getElementById("titulo");
const campoDescricao = document.getElementById("descricao");
const inputCor = document.getElementById("inputCor");
const btnAddCor = document.getElementById("btnAddCor");
const listaCores = document.getElementById("listaCores");
const campoNivelUso = document.getElementById("nivelUso");
const campoSemEtiqueta = document.getElementById("semEtiqueta");
const campoEsgotado = document.getElementById("esgotado");
const inputImagens = document.getElementById("imagens");
const previewImagens = document.getElementById("previewImagens");
const statusForm = document.getElementById("statusForm");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const listaPecas = document.getElementById("listaPecas");

// ------------------------------------------------------------
// ESTADO LOCAL
// ------------------------------------------------------------
let cores = [];
let imagensExistentes = [];   // [{ url, publicId }] já salvas no Firestore (modo edição)
let arquivosNovos = [];       // File[] escolhidos e ainda não enviados ao Cloudinary
let edicaoId = null;
let cacheCategorias = [];
let cachePecas = [];

// ============================================================
// CATEGORIAS
// ============================================================

const categoriasQuery = query(collection(db, "categorias"), orderBy("nome"));

onSnapshot(categoriasQuery, (snapshot) => {
    cacheCategorias = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
    renderizarCategorias();
});

function renderizarCategorias() {
    listaCategorias.innerHTML = cacheCategorias.map((categoria) => `
        <div class="categoria-item">
            <span>${escapeHtml(categoria.nome)}</span>
            <button type="button" data-id="${categoria.id}" title="Remover categoria">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join("") || `<p class="subtitulo">Nenhuma categoria cadastrada ainda.</p>`;

    selectCategoria.innerHTML = `<option value="">Selecione uma categoria</option>` +
        cacheCategorias.map((categoria) => `<option value="${escapeAttr(categoria.nome)}">${escapeHtml(categoria.nome)}</option>`).join("");

    listaCategorias.querySelectorAll("button[data-id]").forEach((botao) => {
        botao.addEventListener("click", async () => {
            if (confirm("Remover esta categoria? Peças já cadastradas com ela não serão alteradas.")) {
                await deleteDoc(doc(db, "categorias", botao.dataset.id));
            }
        });
    });
}

formCategoria.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nome = novaCategoria.value.trim();
    if (!nome) return;

    const jaExiste = cacheCategorias.some((categoria) => categoria.nome.toLowerCase() === nome.toLowerCase());
    if (jaExiste) {
        alert("Essa categoria já existe.");
        return;
    }

    await addDoc(collection(db, "categorias"), {
        nome,
        criadoEm: serverTimestamp()
    });

    formCategoria.reset();
});

// ============================================================
// CORES (chips do formulário de peça)
// ============================================================

function renderizarCores() {
    listaCores.innerHTML = cores.map((cor, indice) => `
        <span class="chip">
            ${escapeHtml(cor)}
            <button type="button" data-indice="${indice}">&times;</button>
        </span>
    `).join("");

    listaCores.querySelectorAll("button[data-indice]").forEach((botao) => {
        botao.addEventListener("click", () => {
            cores.splice(Number(botao.dataset.indice), 1);
            renderizarCores();
        });
    });
}

function adicionarCor() {
    const valor = inputCor.value.trim();
    if (!valor) return;
    if (!cores.some((cor) => cor.toLowerCase() === valor.toLowerCase())) {
        cores.push(valor);
        renderizarCores();
    }
    inputCor.value = "";
    inputCor.focus();
}

btnAddCor.addEventListener("click", adicionarCor);
inputCor.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
        evento.preventDefault();
        adicionarCor();
    }
});

// ============================================================
// IMAGENS (múltiplas fotos por peça)
// ============================================================

inputImagens.addEventListener("change", () => {
    arquivosNovos = arquivosNovos.concat(Array.from(inputImagens.files));
    inputImagens.value = "";
    renderizarPreviewImagens();
});

function renderizarPreviewImagens() {
    const miniaturasExistentes = imagensExistentes.map((imagem, indice) => `
        <div class="miniatura" data-tipo="existente" data-indice="${indice}">
            <img src="${imagem.url}" alt="">
            <button type="button" data-tipo="existente" data-indice="${indice}">&times;</button>
        </div>
    `).join("");

    const miniaturasNovas = arquivosNovos.map((arquivo, indice) => `
        <div class="miniatura" data-tipo="novo" data-indice="${indice}">
            <img src="${URL.createObjectURL(arquivo)}" alt="">
            <button type="button" data-tipo="novo" data-indice="${indice}">&times;</button>
        </div>
    `).join("");

    previewImagens.innerHTML = miniaturasExistentes + miniaturasNovas;

    previewImagens.querySelectorAll("button[data-tipo]").forEach((botao) => {
        botao.addEventListener("click", () => {
            const indice = Number(botao.dataset.indice);
            if (botao.dataset.tipo === "existente") {
                imagensExistentes.splice(indice, 1);
            } else {
                arquivosNovos.splice(indice, 1);
            }
            renderizarPreviewImagens();
        });
    });
}

// ============================================================
// PEÇAS — formulário (criar/editar)
// ============================================================

const pecasQuery = query(collection(db, "pecas"), orderBy("criadoEm", "desc"));

onSnapshot(pecasQuery, (snapshot) => {
    cachePecas = snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
    renderizarListaPecas();
});

function renderizarListaPecas() {
    listaPecas.innerHTML = cachePecas.map((peca) => {
        const thumb = peca.imagens?.[0]?.url || "";
        return `
            <div class="peca-item">
                ${thumb
                    ? `<img class="peca-thumb" src="${thumb}" alt="">`
                    : `<div class="peca-thumb"></div>`}
                <div class="peca-info">
                    <h4>${escapeHtml(peca.titulo)}</h4>
                    <div class="peca-badges">
                        <span class="badge">${escapeHtml(peca.categoria || "Sem categoria")}</span>
                        <span class="badge badge-condicao">${rotuloNivelUso(peca.nivelUso)}</span>
                        ${peca.semEtiqueta ? `<span class="badge badge-etiqueta">Sem etiqueta</span>` : ""}
                        ${peca.esgotado ? `<span class="badge badge-esgotado">Esgotado</span>` : ""}
                    </div>
                    <div class="peca-acoes">
                        <button type="button" class="btn btn-outline btn-sm" data-editar="${peca.id}">Editar</button>
                        <button type="button" class="btn btn-danger btn-sm" data-excluir="${peca.id}">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    }).join("") || `<p class="subtitulo">Nenhuma peça cadastrada ainda.</p>`;

    listaPecas.querySelectorAll("button[data-editar]").forEach((botao) => {
        botao.addEventListener("click", () => iniciarEdicao(botao.dataset.editar));
    });

    listaPecas.querySelectorAll("button[data-excluir]").forEach((botao) => {
        botao.addEventListener("click", () => excluirPeca(botao.dataset.excluir));
    });
}

function rotuloNivelUso(nivel) {
    return { novo: "Novo", seminovo: "Seminovo", usado: "Usado" }[nivel] || nivel || "";
}

function iniciarEdicao(id) {
    const peca = cachePecas.find((item) => item.id === id);
    if (!peca) return;

    edicaoId = id;
    campoTitulo.value = peca.titulo || "";
    selectCategoria.value = peca.categoria || "";
    campoDescricao.value = peca.descricao || "";
    campoNivelUso.value = peca.nivelUso || "novo";
    campoSemEtiqueta.checked = Boolean(peca.semEtiqueta);
    campoEsgotado.checked = Boolean(peca.esgotado);

    cores = [...(peca.cores || [])];
    renderizarCores();

    imagensExistentes = [...(peca.imagens || [])];
    arquivosNovos = [];
    renderizarPreviewImagens();

    tituloForm.textContent = "Editar peça";
    btnCancelarEdicao.classList.remove("oculto");
    formPeca.scrollIntoView({ behavior: "smooth", block: "start" });
}

function limparFormulario() {
    formPeca.reset();
    edicaoId = null;
    cores = [];
    imagensExistentes = [];
    arquivosNovos = [];
    renderizarCores();
    renderizarPreviewImagens();
    tituloForm.textContent = "Nova peça";
    btnCancelarEdicao.classList.add("oculto");
    statusForm.textContent = "";
}

btnCancelarEdicao.addEventListener("click", limparFormulario);

formPeca.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    statusForm.textContent = "";

    if (!selectCategoria.value) {
        statusForm.textContent = "Selecione uma categoria.";
        return;
    }

    if (imagensExistentes.length === 0 && arquivosNovos.length === 0) {
        statusForm.textContent = "Adicione pelo menos uma foto da peça.";
        return;
    }

    const botaoSalvar = document.getElementById("btnSalvar");
    botaoSalvar.disabled = true;
    statusForm.textContent = "Salvando...";

    try {
        const uploads = await Promise.all(arquivosNovos.map(async (arquivo) => {
            const resultado = await uploadImagem(arquivo);
            return { url: resultado.secure_url, publicId: resultado.public_id };
        }));

        const imagens = [...imagensExistentes, ...uploads];

        const dadosPeca = {
            titulo: campoTitulo.value.trim(),
            categoria: selectCategoria.value,
            descricao: campoDescricao.value.trim(),
            cores,
            nivelUso: campoNivelUso.value,
            semEtiqueta: campoSemEtiqueta.checked,
            esgotado: campoEsgotado.checked,
            imagens
        };

        if (edicaoId) {
            await updateDoc(doc(db, "pecas", edicaoId), dadosPeca);
        } else {
            await addDoc(collection(db, "pecas"), { ...dadosPeca, criadoEm: serverTimestamp() });
        }

        limparFormulario();
    } catch (erro) {
        console.error(erro);
        statusForm.textContent = "Erro ao salvar a peça. Tente novamente.";
    } finally {
        botaoSalvar.disabled = false;
    }
});

async function excluirPeca(id) {
    const peca = cachePecas.find((item) => item.id === id);
    if (!peca) return;

    if (!confirm(`Excluir "${peca.titulo}"? Essa ação não pode ser desfeita.`)) return;

    await Promise.all((peca.imagens || []).map((imagem) => removerImagem(imagem.publicId)));
    await deleteDoc(doc(db, "pecas", id));

    if (edicaoId === id) limparFormulario();
}

// ------------------------------------------------------------
// UTILITÁRIOS
// ------------------------------------------------------------
function escapeHtml(texto = "") {
    return texto.replace(/[&<>"']/g, (caractere) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[caractere]));
}

function escapeAttr(texto = "") {
    return escapeHtml(texto);
}
