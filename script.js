const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const toggleDetectBtn = document.getElementById("toggleDetectBtn");
const poseResult = document.getElementById("poseResult");
const feedbackContainer = document.getElementById("feedbackContainer");

let pose;
let camera;
let canvas;
let ctx;
let stream = null; // Para mantener referencia al stream de la cámara
let isDetectionActive = false; // Estado de la detección

// Variables globales de pose para el feedback
let headY = null;
let leftHandY = null;
let rightHandY = null;

// Sistema de cola para reproducción de voz
let speechQueue = [];
let isSpeaking = false;
let currentUtterance = null;

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
    // Detener detección si está activa
    if (isDetectionActive) {
      stopDetection();
    }

    // Detener cámara anterior si existe
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // Iniciar nueva cámara
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    video.srcObject = stream;
    startBtn.textContent = "Reiniciar Cámara";

    // Configurar canvas cuando el video esté listo
    video.onloadedmetadata = () => {
      setupCanvas();
      toggleDetectBtn.disabled = false;
      toggleDetectBtn.textContent = "Iniciar Detección";
    };
  } catch (err) {
    alert("No se pudo acceder a la cámara: " + err.message);
  }
});

// Función para detener la detección
function stopDetection() {
  if (camera) {
    camera.stop();
  }
  isDetectionActive = false;
  toggleDetectBtn.textContent = "Iniciar Detección";
  poseResult.textContent = "Detección detenida";
}

// Modificar evento de detección (toggle)
toggleDetectBtn.addEventListener("click", () => {
  if (!isDetectionActive) {
    // Iniciar detección
    setupPose();
    isDetectionActive = true;
    toggleDetectBtn.textContent = "Detener Detección";
    poseResult.textContent = "Detectando pose...";
    toggleDetectBtn.classList.add("active");
  } else {
    // Detener detección
    stopDetection();
    toggleDetectBtn.classList.remove("active");
  }
});

function onResults(results) {
  if (!isDetectionActive) return; // No procesar si la detección está desactivada

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

    const now = Date.now();
    if (
      !isGeneratingFeedback &&
      now - lastAutoFeedbackTime > MIN_FEEDBACK_INTERVAL &&
      !isSpeaking // <-- Añadir esta condición
    ) {
      captureAndSendFeedback();
      lastAutoFeedbackTime = now;
    }
  } else {
    poseResult.textContent = "❌ No estás levantando ambos brazos";
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
    speakText(message);
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
}

async function setupPose() {
  // Detener instancia anterior si existe
  if (pose) {
    try {
      await pose.close();
    } catch (e) {
      console.warn("Error cerrando instancia anterior de Pose:", e);
    }
  }

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

  // Reiniciar cámara de MediaPipe
  if (camera) {
    camera.stop();
  }

  camera = new Camera(video, {
    onFrame: async () => {
      if (isDetectionActive) {
        try {
          await pose.send({ image: video });
        } catch (err) {
          console.error("Error en detección de pose:", err);
        }
      }
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

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

function speakText(text) {
  if (!text) return;

  // Agregar a la cola
  speechQueue.push(text);

  // Reproducir si no hay nada en curso
  if (!isSpeaking) {
    processSpeechQueue();
  }
}

function processSpeechQueue() {
  if (speechQueue.length === 0 || isSpeaking) return;

  isSpeaking = true;
  const text = speechQueue.shift();

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = "es-MX";
  currentUtterance.rate = 0.9;
  currentUtterance.pitch = 1;
  currentUtterance.volume = 1;

  currentUtterance.onend = () => {
    isSpeaking = false;
    setTimeout(processSpeechQueue, 500); // Pequeña pausa entre mensajes
  };

  speechSynthesis.speak(currentUtterance);
}
