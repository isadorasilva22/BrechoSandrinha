// ============================================================
// CLOUDINARY — upload das fotos das peças (usado por admin.js)
// ============================================================

const CLOUD_NAME = "jgrpoeqb";
const UPLOAD_PRESET = "brechosandrinha";
const DIMENSAO_MAXIMA = 1600; // px no lado maior — suficiente pra carrossel, evita fotos de celular passarem do limite de 10MB do Cloudinary
const QUALIDADE_JPEG = 0.82;

async function redimensionarImagem(arquivo) {
    try {
        const bitmap = await createImageBitmap(arquivo);
        const escala = Math.min(1, DIMENSAO_MAXIMA / Math.max(bitmap.width, bitmap.height));
        const largura = Math.round(bitmap.width * escala);
        const altura = Math.round(bitmap.height * escala);

        const canvas = document.createElement("canvas");
        canvas.width = largura;
        canvas.height = altura;
        canvas.getContext("2d").drawImage(bitmap, 0, 0, largura, altura);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG));
        return blob || arquivo;
    } catch {
        // Se o navegador não conseguir decodificar a imagem, envia o arquivo original.
        return arquivo;
    }
}

export async function uploadImagem(arquivo) {

    const imagemParaEnviar = await redimensionarImagem(arquivo);

    const formData = new FormData();
    formData.append("file", imagemParaEnviar, arquivo.name);
    formData.append("upload_preset", UPLOAD_PRESET);

    const resposta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        const motivo = corpo?.error?.message || `HTTP ${resposta.status}`;
        throw new Error(`Falha ao enviar imagem para o Cloudinary: ${motivo}`);
    }

    return resposta.json();
}

export async function removerImagem(publicId) {
    // A exclusão de imagens no Cloudinary exige assinatura (API secret),
    // que não pode ficar exposta no front-end. Por isso, ao remover uma
    // foto de uma peça, apenas paramos de referenciá-la no Firestore —
    // ela continua existindo na conta Cloudinary até uma limpeza manual
    // ou uma função de backend dedicada.
    console.warn(`Imagem ${publicId} removida da peça, mas mantida no Cloudinary (requer limpeza manual).`);
}
