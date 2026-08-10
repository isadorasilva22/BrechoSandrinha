// ============================================================
// CLOUDINARY — upload das fotos das peças (usado por admin.js)
// ============================================================

const CLOUD_NAME = "jgrpoeqb";
const UPLOAD_PRESET = "brechosandrinha";

export async function uploadImagem(arquivo) {

    const formData = new FormData();
    formData.append("file", arquivo);
    formData.append("upload_preset", UPLOAD_PRESET);

    const resposta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!resposta.ok) {
        throw new Error("Falha ao enviar imagem para o Cloudinary.");
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
