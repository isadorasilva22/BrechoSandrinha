// ============================================================
// AUTH — login/logout da administração via Firebase Auth
// (usado apenas em admin.html)
// ============================================================

import { auth } from "./firebase.js";

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const formLogin = document.getElementById("formLogin");
const loginEmail = document.getElementById("loginEmail");
const loginSenha = document.getElementById("loginSenha");
const loginErro = document.getElementById("loginErro");
const btnLogout = document.getElementById("btnLogout");
const usuarioLogado = document.getElementById("usuarioLogado");

onAuthStateChanged(auth, (usuario) => {

    if (usuario) {
        loginSection.classList.add("oculto");
        adminSection.classList.remove("oculto");
        usuarioLogado.textContent = usuario.email;
    } else {
        loginSection.classList.remove("oculto");
        adminSection.classList.add("oculto");
        usuarioLogado.textContent = "";
    }

});

formLogin.addEventListener("submit", async (evento) => {

    evento.preventDefault();
    loginErro.textContent = "";

    try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginSenha.value);
        formLogin.reset();
    } catch (erro) {
        loginErro.textContent = "E-mail ou senha inválidos.";
    }

});

btnLogout.addEventListener("click", () => {
    signOut(auth);
});
