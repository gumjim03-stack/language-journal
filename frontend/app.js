function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ===== Selecciones principales =====
const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");
const addButtons = document.querySelectorAll(".add-cube-btn");
const spanishContainer = document.getElementById("spanish-container");
const japaneseContainer = document.getElementById("japanese-container");

// ===== Activar tabs =====
tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const tabId = tab.dataset.tab;
        // Actualizar idioma actual para greeting
if (tabId === "spanish") {
    currentLang = "es";
} else if (tabId === "japanese") {
    currentLang = "jp";
}
        tabContents.forEach(tc => tc.classList.remove("active"));
        document.getElementById(tabId).classList.add("active");
    });
});

// ===== Función para crear un cuadro de texto =====
function createEditorCube(lang, content = "", id = null, audio = null, words = []) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("editor-cube");
    wrapper.style.position = "relative"; // para línea tipo cuaderno

    // ===== Editor de texto =====
    const editor = document.createElement("div");
    editor.classList.add("editor");
    editor.contentEditable = true;
    editor.innerText = content;
    editor.innerHTML = editor.innerText;


editor.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || !id) return;
    if(selection.rangeCount == 0) return;
    if(!selection.anchorNode || !selection.anchorNode.parentElement.closest(".editor-cube")) return;

    showAddWordModal(selectedText, id, editor);
});

    // ===== Botón guardar =====
    const saveBtn = document.createElement("button");
    saveBtn.innerText = "💾 Guardar";
    saveBtn.style.marginTop = "5px";

    // ===== Botón eliminar =====
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "🗑 Eliminar";
    deleteBtn.style.marginLeft = "5px";

    // ===== Input de audio =====
    const audioInput = document.createElement("input");
    audioInput.type = "file";
    audioInput.accept = "audio/*";
    audioInput.style.display = "block";
    audioInput.style.marginTop = "5px";

    // ===== Botón reproducir audio =====
    const playBtn = document.createElement("button");
    playBtn.innerText = "▶️ Reproducir";
    playBtn.style.marginTop = "5px";
    if (!audio) playBtn.style.display = "none";

    // ===== Botón pausar audio =====
    const pauseBtn = document.createElement("button");
    pauseBtn.innerText = "⏸";
    pauseBtn.style.marginLeft = "5px";

    if (audio) {
        const audioPlayer = new Audio(audio);
        playBtn.addEventListener("click", () => audioPlayer.play());
        pauseBtn.addEventListener("click", () => audioPlayer.pause());
    }

    // ===== Botón grabar audio =====
    const recordBtn = document.createElement("button");
    recordBtn.innerText = "🎤 Grabar audio";
    recordBtn.style.marginTop = "5px";
    let mediaRecorder;
    let audioChunks = [];

  recordBtn.addEventListener("click", async () => {
    if (recordBtn.dataset.recording === "true") {
        mediaRecorder.stop();
        recordBtn.dataset.recording = "false";
        recordBtn.innerText = "🎤 Grabar audio";
    } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            const formData = new FormData();
            formData.append("id", id);
            formData.append("lang", lang);
            formData.append("content", editor.innerText);
            formData.append("audio", audioBlob, `grabacion-${Date.now()}.webm`);

            const res = await fetch("/texts", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                alert("Your voice has been recorded perfectly");

                // 🔥 Cerrar micrófono
                stream.getTracks().forEach(track => track.stop());

                // 🔥 Recargar cubos para que aparezca botón reproducir
                loadCubes();
            }
        };

        mediaRecorder.start();
        recordBtn.dataset.recording = "true";
        recordBtn.innerText = "⏹ Detener grabación";
    }
});

    // ===== Guardar cuadro =====
    saveBtn.addEventListener("click", async () => {
        const formData = new FormData();
        formData.append("id", id || "");
        formData.append("lang", lang);
        formData.append("content", editor.innerText);
        if (audioInput.files[0]) formData.append("audio", audioInput.files[0]);

        const res = await fetch("/texts", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            alert("It will be great to read this");
            location.reload();
        }
    });

    // ===== Eliminar cuadro =====
    deleteBtn.addEventListener("click", () => {
        if (confirm("nooo, are you going to kill me? haha I joke")) {
            wrapper.remove();
            if (id) {
                fetch(`/texts/${id}`, { method: "DELETE" });
            }
        }
    });

    // ===== Subrayado de palabras guardadas (sin tocar botones) =====
function highlightWords(editor, words) {
    if (!words || words.length === 0) return;

    const childNodes = Array.from(editor.childNodes);

    childNodes.forEach(node => {

        if (node.nodeType === Node.TEXT_NODE) {

            let text = node.textContent.normalize("NFC");

            words.forEach(wordObj => {

                const normalizedWord = wordObj.text.normalize("NFC");
                const safeWord = escapeRegExp(normalizedWord);
                const regex = new RegExp(safeWord, "gu");

                text = text.replace(regex, match => {
                    return `<span class="highlight-word" 
                        contenteditable="false"
                        data-word='${JSON.stringify(wordObj)}' 
                        style="background-color:${wordObj.color || '#ffff00'}">
                        ${match}
                    </span>`;
                });

            });

            const temp = document.createElement("div");
            temp.innerHTML = text;

            while (temp.firstChild) {
                node.parentNode.insertBefore(temp.firstChild, node);
            }

            node.remove();

        } else if (node.nodeType === Node.ELEMENT_NODE) {
            highlightWords(node, words);
        }

    });

    editor.querySelectorAll(".highlight-word").forEach(span => {
        span.addEventListener("click", () => {
            const wordObj = JSON.parse(span.dataset.word);
            showWordModal(wordObj);
        });
    });
}

    highlightWords(editor, words);


     // Agregar clases para que todos los botones tengan el mismo estilo
saveBtn.classList.add("tab");
deleteBtn.classList.add("tab");
playBtn.classList.add("tab");
pauseBtn.classList.add("tab");
recordBtn.classList.add("tab");


    // ===== Agregar elementos al wrapper =====
    wrapper.appendChild(editor);
    wrapper.appendChild(saveBtn);
    wrapper.appendChild(deleteBtn);
    wrapper.appendChild(audioInput);
    wrapper.appendChild(playBtn);
    wrapper.appendChild(pauseBtn);
    wrapper.appendChild(recordBtn);

    return wrapper;
}

// ======================================
// Función para mostrar modal de palabra
// ======================================
function showWordModal(wordObj) {

    const overlay = document.createElement("div");
    overlay.classList.add("modal");

    const modal = document.createElement("div");
    modal.classList.add("modal-box");

    modal.innerHTML = `
        <h3>${wordObj.text}</h3>
        <p><strong>Significado:</strong> ${wordObj.meaning || ""}</p>
        <p><strong>Ejemplo:</strong> ${wordObj.example || ""}</p>
        <p><strong>Mini reto:</strong> ${wordObj.challenge || ""}</p>
        <button id="closeModal">Cerrar</button>
    `;

    if (wordObj.audio) {
        const audioPlayer = document.createElement("audio");
        audioPlayer.src = wordObj.audio;
        audioPlayer.controls = true;
        audioPlayer.classList.add("modal-audio");
        modal.appendChild(audioPlayer);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add("show");
    });

    modal.querySelector("#closeModal").addEventListener("click", () => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 200);
    });
}
console.log("Enviando datos...");

function showAddWordModal(word, textId, editor) {

    const overlay = document.createElement("div");
    overlay.classList.add("modal");

    const modal = document.createElement("div");
    modal.classList.add("modal-box");

    let recordedBlob = null; 
    let mediaRecorder = null;
    let audioChunks = [];

    modal.innerHTML = `
        <h3>Guardar palabra: ${word}</h3>
        <input placeholder="Significado" id="meaning">
        <input placeholder="Ejemplo" id="example">
        <input placeholder="Mini reto" id="challenge">
        <input type="color" id="wordColor" value="#ffff00" style="margin-top:5px; width:100px;">
        <label>Color del subrayado</label>
        <br><br>
        <button type="button" id="recordWordAudio">🎙 Grabar audio</button>
        <button type="button" id="saveWord">Guardar</button>
        <button type="button" id="closeModal">Cancelar</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add("show");
    });

    const recordBtn = modal.querySelector("#recordWordAudio");
    const saveBtn = modal.querySelector("#saveWord");
    const closeBtn = modal.querySelector("#closeModal");

    recordBtn.classList.add("tab");
    saveBtn.classList.add("tab");
    closeBtn.classList.add("tab");

    // ===== Grabación =====
    recordBtn.addEventListener("click", async () => {
        if (!mediaRecorder) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
                audioChunks = [];
                recordBtn.textContent = "🔁 Grabar de nuevo";
            };
        }

        if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            recordBtn.textContent = "🎙 Procesando...";
        } else {
            audioChunks = [];
            mediaRecorder.start();
            recordBtn.textContent = "⏹ Detener grabación";
        }
    });

    // ===== Guardar palabra =====
    saveBtn.addEventListener("click", async () => {

        const formData = new FormData();
        formData.append("word", word);
        formData.append("meaning", modal.querySelector("#meaning").value);
        formData.append("example", modal.querySelector("#example").value);
        formData.append("challenge", modal.querySelector("#challenge").value);
        formData.append("color", modal.querySelector("#wordColor").value);

        if (recordedBlob) {
            formData.append("audio", recordedBlob, "word.webm");
        }

        await fetch(`/texts/${textId}/words`, {
            method: "POST",
            body: formData
        });

        location.reload();
    });

    // ===== Cerrar =====
    closeBtn.addEventListener("click", () => {
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 200);
    });
}
// ===== Guardar cuadro en backend =====
async function saveEditorCube(lang, editor, id) {
    try {
        const res = await fetch('/texts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id,
                lang: lang,
                content: editor.innerText
            })
        });
        await res.json();
    } catch (err) {
        console.error("Error guardando cuadro:", err);
    }
}
console.log("Respuesta recibida");

// ===== Agregar un nuevo cuadro al contenedor =====
function addNewCube(lang, content = "", id = null) {
    const cube = createEditorCube(lang, content, id);
    if (lang === "spanish") spanishContainer.appendChild(cube);
    else if (lang === "japanese") japaneseContainer.appendChild(cube);
}

// ===== Cargar cuadros desde backend =====
async function loadCubes() {
    try {
        const res = await fetch('/texts');
        const texts = await res.json();

        texts.forEach(t => {
    const cube = createEditorCube(t.lang, t.content, String(t._id), t.audio, t.words || []);
    if (t.lang === "spanish") spanishContainer.appendChild(cube);
    else japaneseContainer.appendChild(cube);
});
    } catch (err) {
        console.error("Error cargando cuadros:", err);
    }
}

// ===== Botones “+ Agregar cuadro” =====
addButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const lang = btn.dataset.lang;
        addNewCube(lang);
    });
});

// Variable global para diccionario
let dictionary = {};

// Cargar diccionario al inicio
async function loadDictionary() {
    try {
        const res = await fetch('/dictionary');
        dictionary = await res.json();
    } catch (err) {
        console.error("Error cargando diccionario:", err);
    }
}

// Llamar al inicio
loadDictionary();

const tooltip = document.getElementById("tooltip");

// Detectar palabras al hacer click o mouseup
document.addEventListener("mouseup", (e) => {

    // 1️⃣ Si haces click dentro de un modal, no hacer nada
    if (e.target.closest(".modal")) return;

    // 2️⃣ Si haces click en una palabra subrayada, no hacer nada
    if (e.target.closest(".highlight-word")) return;

    // 3️⃣ Si el click no fue dentro de un editor, no hacer nada
    if (!e.target.closest(".editor")) {
        tooltip.style.display = "none";
        return;
    }

    const selection = window.getSelection();

    // 4️⃣ Si no hay selección válida
    if (!selection || selection.rangeCount === 0) {
        tooltip.style.display = "none";
        return;
    }

    const word = selection.toString().trim().toLowerCase();

    if (!word || !dictionary[word]) {
        tooltip.style.display = "none";
        return;
    }

    const data = dictionary[word];

    tooltip.innerHTML = `
        <strong>${word}</strong><br>
        Significado: ${data.meaning}<br>
        Ejemplo: ${data.example}<br>
        ${data.audio ? `<button id="playWordAudio">▶️ Audio</button>` : ''}
    `;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.display = "block";

    if (data.audio) {
        const btn = document.getElementById("playWordAudio");
        btn.addEventListener("click", () => {
            const audio = new Audio(data.audio);
            audio.play();
        });
    }
});

// Ocultar tooltip si se hace clic fuera del editor o de un modal
document.addEventListener("click", (e) => {
    const isInsideEditor = e.target.closest(".editor");
    const isInsideModal = e.target.closest(".modal");
    if (!isInsideEditor && !isInsideModal) {
        tooltip.style.display = "none";
    }
});

let currentLang = "es";

// ===== Inicialización =====
loadCubes();

const greetingBtn = document.getElementById("playGreeting");

let clickTimeout;
let greetingRecorder;
let greetingChunks = [];
let greetingAudio = new Audio();
greetingAudio.addEventListener("ended", () => {
    greetingAudio.currentTime = 0;
});

greetingBtn.addEventListener("click", (e) => {

    clearTimeout(clickTimeout);

    clickTimeout = setTimeout(async () => {

        const lang = currentLang;

        // 1️⃣ Si está grabando → detener
        if (greetingRecorder && greetingRecorder.state === "recording") {
            greetingRecorder.stop();
            greetingBtn.classList.remove("recording", "greeting-recording");
            return;
        }

        // 2️⃣ Si ya está sonando → pausar
        if (!greetingAudio.paused) {
            greetingAudio.pause();
            return;
        }

        // 3️⃣ Si ya tiene audio cargado → reanudar
        if (greetingAudio.src && greetingAudio.src.includes(`/greeting/${lang}`)) {
            greetingAudio.play();
            return;
        }

        // 4️⃣ Si no hay audio cargado → buscar en servidor
        try {
const response = await fetch(`/greeting/${lang}`);
if (response.ok) {
    const data = await response.json();
    greetingAudio.src = data.audio;
    greetingAudio.play();
    return;
} else {
    console.log("No greeting found yet");
}
        } catch {}

        // 5️⃣ Si no existe → grabar
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        greetingRecorder = new MediaRecorder(stream);
        greetingChunks = [];

        greetingRecorder.ondataavailable = e => {
            greetingChunks.push(e.data);
        };

        greetingRecorder.onstop = async () => {

            const blob = new Blob(greetingChunks, { type: "audio/webm" });
            greetingChunks = [];

            const formData = new FormData();
            formData.append("audio", blob, `greeting-${lang}.webm`);

const res = await fetch(`/greeting/${lang}`, {
    method: "POST",
    body: formData
});

const data = await res.json();
greetingAudio.src = data.audio;
greetingAudio.play();

            greetingBtn.classList.remove("recording", "greeting-recording");
            alert("Siiiiii, thank you for your words 💌");
        };

        greetingRecorder.start();
        greetingBtn.classList.add("recording", "greeting-recording");

    }, 250);
});

greetingBtn.addEventListener("dblclick", async () => {

    clearTimeout(clickTimeout); // Cancela el click normal

    // Detener reproducción si estaba sonando
    greetingAudio.pause();
    greetingAudio.currentTime = 0;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    greetingRecorder = new MediaRecorder(stream);
    greetingChunks = [];

    greetingRecorder.ondataavailable = e => {
        greetingChunks.push(e.data);
    };

    greetingRecorder.onstop = async () => {
        const lang = currentLang;
        const blob = new Blob(greetingChunks, { type: "audio/webm" });
        greetingChunks = []; 

        const formData = new FormData();
        formData.append("audio", blob, `greeting-${lang}.webm`);

        await fetch(`/greeting/${lang}`, {
            method: "POST",
            body: formData
        });

        greetingBtn.classList.remove("recording");
        alert("What an incredible thing you will say now 💌");
    };

    greetingRecorder.start();
    greetingBtn.classList.add("recording", "greeting-recording");

    setTimeout(() => {
        if (greetingRecorder.state === "recording", "greeting-recording") {
            greetingRecorder.stop();
        }
    }, 10000);
});