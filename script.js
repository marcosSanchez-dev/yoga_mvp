const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const detectBtn = document.getElementById("detectBtn");
const feedbackBtn = document.getElementById("feedbackBtn");
const speakBtn = document.getElementById("speakBtn");
const poseResult = document.getElementById("poseResult");
const feedbackContainer = document.getElementById("feedbackContainer");

let pose;
let camera;
let canvas;
let ctx;

// Variables globales de pose para el feedback
let headY = null;
let leftHandY = null;
let rightHandY = null;

// Variables para control de frecuencia de feedback
let lastAutoFeedbackTime = 0;
const MIN_FEEDBACK_INTERVAL = 5000; // 5 segundos entre feedbacks automáticos
let isGeneratingFeedback = false;

// Crear canvas para capturas
function setupCanvas() {
  canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext("2d");
}

startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    video.srcObject = stream;

    // Esperar a que el video cargue para configurar canvas
    video.onloadedmetadata = () => {
      setupCanvas();
      detectBtn.disabled = false;
    };
  } catch (err) {
    alert("No se pudo acceder a la cámara: " + err.message);
  }
});

detectBtn.addEventListener("click", () => {
  setupPose();
});

function onResults(results) {
  if (!results.poseLandmarks) {
    poseResult.textContent = "❌ No se detecta el cuerpo";
    // Resetear valores
    headY = leftHandY = rightHandY = null;
    return;
  }

  // Actualizar variables GLOBALES con los landmarks
  headY = results.poseLandmarks[0].y;
  leftHandY = results.poseLandmarks[15].y;
  rightHandY = results.poseLandmarks[16].y;

  // Condición: brazos arriba (manos por encima de la cabeza)
  if (leftHandY < headY && rightHandY < headY) {
    poseResult.textContent = "✅ Pose detectada: Brazos Arriba";
    feedbackBtn.disabled = false;
    speakBtn.disabled = false;

    // Solo enviar feedback automático si ha pasado el tiempo mínimo y no está generando
    const now = Date.now();
    if (
      !isGeneratingFeedback &&
      now - lastAutoFeedbackTime > MIN_FEEDBACK_INTERVAL
    ) {
      captureAndSendFeedback();
      lastAutoFeedbackTime = now;
    }
  } else {
    poseResult.textContent = "❌ No estás levantando ambos brazos";
    feedbackBtn.disabled = true;
    speakBtn.disabled = true;
  }
}

// Capturar imagen y enviar feedback
function captureAndSendFeedback(isManual = false) {
  if (!canvas || !ctx) return;

  // Dibujar el frame actual en el canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Obtener imagen como base64
  const imageData = canvas.toDataURL("image/jpeg", 0.8);

  // Crear descripción básica de la pose
  const poseDescription =
    "El usuario está manteniendo una pose de brazos arriba. ";

  // Enviar para feedback
  requestFeedback(poseDescription, imageData, !isManual);
}

async function requestFeedback(poseDescription, imageData, isAuto = false) {
  if (isGeneratingFeedback) return;

  isGeneratingFeedback = true;

  // Mostrar mensaje de carga
  const loadingMessage = showLoadingMessage(isAuto);

  try {
    // Crear payload con imagen y descripción
    const payload = {
      poseDescription,
      imageData,
      isAuto,
    };

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const feedback = data.output;

    // Reemplazar mensaje de carga con el feedback real
    replaceLoadingMessage(loadingMessage, feedback, isAuto);
  } catch (err) {
    console.error("❌ Error al obtener feedback:", err.message);
    replaceLoadingMessage(
      loadingMessage,
      "Error al conectar con el maestro de yoga.",
      false
    );
  } finally {
    isGeneratingFeedback = false;
  }
}

function showLoadingMessage(isAuto) {
  const loadingId = "loading-" + Date.now();

  const messageDiv = document.createElement("div");
  messageDiv.id = loadingId;
  messageDiv.className = "feedback-message loading";

  if (isAuto) {
    messageDiv.innerHTML = `
      <div class="auto-indicator">🧘‍♂️ ANALIZANDO</div>
      <div class="message-content">
        <div class="thinking-indicator">Observando tu pose...</div>
        <div class="spinner"></div>
      </div>
    `;
    messageDiv.style.borderLeft = "4px solid #FF9800";
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="thinking-indicator">Analizando tu postura...</div>
        <div class="spinner"></div>
      </div>
    `;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  // Añadir al inicio del contenedor
  feedbackContainer.insertBefore(messageDiv, feedbackContainer.firstChild);

  // Scroll automático al nuevo mensaje
  feedbackContainer.scrollTop = 0;

  return loadingId;
}

function replaceLoadingMessage(loadingId, message, isAuto) {
  const loadingElement = document.getElementById(loadingId);
  if (!loadingElement) return;

  // Crear nuevo elemento con el mensaje real
  const messageDiv = document.createElement("div");
  messageDiv.className = "feedback-message";

  if (isAuto) {
    messageDiv.innerHTML = `<div class="auto-indicator">🧘‍♂️ MAESTRO</div><div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #4CAF50";
  } else {
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  // Reemplazar el elemento de carga con el mensaje real
  loadingElement.replaceWith(messageDiv);

  // Mantener máximo 5 mensajes
  const messages = feedbackContainer.querySelectorAll(
    ".feedback-message:not(.loading)"
  );
  if (messages.length > 5) {
    feedbackContainer.removeChild(messages[messages.length - 1]);
  }

  // Habilitar botón de hablar para el último mensaje
  speakBtn.disabled = false;
}

async function setupPose() {
  pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 1, // Aumentamos a medio para mejor precisión
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    useWebGL: true,
  });

  pose.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      try {
        await pose.send({ image: video });
      } catch (err) {
        console.error("Error en detección de pose:", err);
      }
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

feedbackBtn.addEventListener("click", async () => {
  feedbackBtn.disabled = true;

  // Verificar si tenemos datos de la pose
  if (headY === null || leftHandY === null || rightHandY === null) {
    addFeedbackToHistory("Esperando datos de tu pose...", false);
    feedbackBtn.disabled = false;
    return;
  }

  captureAndSendFeedback(true);
  feedbackBtn.disabled = false;
});

// Botón para hablar el último feedback
speakBtn.addEventListener("click", () => {
  const messages = feedbackContainer.querySelectorAll(
    ".feedback-message:not(.loading)"
  );
  if (messages.length > 0) {
    const lastMessage = messages[0];
    const messageContent = lastMessage.querySelector(".message-content");
    const text = messageContent
      ? messageContent.textContent
      : lastMessage.textContent;

    if ("speechSynthesis" in window && text.length > 0) {
      // Cancelar cualquier habla previa
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador no soporta síntesis de voz.");
    }
  }
});

// Función auxiliar para añadir mensajes iniciales
function addFeedbackToHistory(message, isAuto) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "feedback-message";

  if (isAuto) {
    messageDiv.innerHTML = `<div class="auto-indicator">🧘‍♂️ MAESTRO</div><div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #4CAF50";
  } else {
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  feedbackContainer.appendChild(messageDiv);
}

// Mensaje inicial
addFeedbackToHistory(
  "Bienvenido al Maestro de Yoga Virtual. Mantén la pose mientras analizo tu postura en tiempo real.",
  false
);
