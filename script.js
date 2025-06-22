const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const toggleDetectBtn = document.getElementById("toggleDetectBtn");
const poseResult = document.getElementById("poseResult");
const feedbackContainer = document.getElementById("feedbackContainer");
const languageToggle = document.getElementById("languageToggle");

let pose;
let camera;
let canvas;
let ctx;
let stream = null;
let isDetectionActive = false;

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
const MIN_FEEDBACK_INTERVAL = 5000;
let isGeneratingFeedback = false;

// Configuración de idioma
let currentLanguage = "es"; // 'es' o 'en'
const languageStrings = {
  es: {
    welcome:
      "Bienvenido al Maestro de Yoga Virtual. Mantén la pose mientras analizo tu postura en tiempo real.",
    startCamera: "Iniciar Cámara",
    restartCamera: "Reiniciar Cámara",
    startDetection: "Iniciar Detección",
    stopDetection: "Detener Detección",
    detecting: "Detectando pose...",
    noBody: "❌ No se detecta el cuerpo",
    poseDetected: "✅ Pose detectada: Brazos Arriba",
    notBothArms: "❌ No estás levantando ambos brazos",
    stopped: "Detección detenida",
    analyzing: "🧘‍♂️ ANALIZANDO",
    thinking: "Observando tu pose...",
    master: "🧘‍♂️ MAESTRO",
    errorFeedback: "Error al conectar con el maestro de yoga.",
    languageBtn: "English",
  },
  en: {
    welcome:
      "Welcome to the Virtual Yoga Master. Hold the pose while I analyze your posture in real time.",
    startCamera: "Start Camera",
    restartCamera: "Restart Camera",
    startDetection: "Start Detection",
    stopDetection: "Stop Detection",
    detecting: "Detecting pose...",
    noBody: "❌ Body not detected",
    poseDetected: "✅ Pose detected: Arms Up",
    notBothArms: "❌ You are not raising both arms",
    stopped: "Detection stopped",
    analyzing: "🧘‍♂️ ANALYZING",
    thinking: "Observing your pose...",
    master: "🧘‍♂️ MASTER",
    errorFeedback: "Error connecting to yoga master.",
    languageBtn: "Español",
  },
};

// Crear canvas para capturas
function setupCanvas() {
  canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext("2d");
}

// Función para cambiar idioma
function setLanguage(lang) {
  currentLanguage = lang;
  const strings = languageStrings[lang];

  // Actualizar textos estáticos
  languageToggle.textContent = strings.languageBtn;
  document.querySelector("h1").textContent =
    lang === "es" ? "🧘 Maestro de Yoga Virtual" : "🧘 Virtual Yoga Master";

  // Actualizar botones
  startBtn.textContent = strings.startCamera;
  toggleDetectBtn.textContent = isDetectionActive
    ? strings.stopDetection
    : strings.startDetection;
  poseResult.textContent = isDetectionActive
    ? strings.detecting
    : strings.stopped;

  // Actualizar mensajes en el contenedor de feedback
  updateFeedbackContainerLanguage();
}

// Actualizar textos en el contenedor de feedback
function updateFeedbackContainerLanguage() {
  const messages = feedbackContainer.querySelectorAll(".feedback-message");
  messages.forEach((msg) => {
    const content = msg.querySelector(".message-content");
    if (content) {
      const autoIndicator = msg.querySelector(".auto-indicator");
      if (autoIndicator) {
        autoIndicator.textContent = languageStrings[currentLanguage].master;
      }

      // Actualizar mensajes específicos
      if (
        content.textContent.includes("Bienvenido") ||
        content.textContent.includes("Welcome")
      ) {
        content.textContent = languageStrings[currentLanguage].welcome;
      } else if (content.textContent.includes("Error")) {
        content.textContent = languageStrings[currentLanguage].errorFeedback;
      }
    }
  });
}

// Evento para cambio de idioma
languageToggle.addEventListener("click", () => {
  const newLang = currentLanguage === "es" ? "en" : "es";
  setLanguage(newLang);
});

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
    startBtn.textContent = languageStrings[currentLanguage].restartCamera;

    // Configurar canvas cuando el video esté listo
    video.onloadedmetadata = () => {
      setupCanvas();
      toggleDetectBtn.disabled = false;
      toggleDetectBtn.textContent =
        languageStrings[currentLanguage].startDetection;
    };
  } catch (err) {
    alert(
      currentLanguage === "es"
        ? "No se pudo acceder a la cámara: " + err.message
        : "Could not access camera: " + err.message
    );
  }
});

// Función para detener la detección
function stopDetection() {
  if (camera) {
    camera.stop();
  }
  isDetectionActive = false;
  toggleDetectBtn.textContent = languageStrings[currentLanguage].startDetection;
  poseResult.textContent = languageStrings[currentLanguage].stopped;
  toggleDetectBtn.classList.remove("active");
}

// Modificar evento de detección (toggle)
toggleDetectBtn.addEventListener("click", () => {
  if (!isDetectionActive) {
    // Iniciar detección
    setupPose();
    isDetectionActive = true;
    toggleDetectBtn.textContent =
      languageStrings[currentLanguage].stopDetection;
    poseResult.textContent = languageStrings[currentLanguage].detecting;
    toggleDetectBtn.classList.add("active");
  } else {
    // Detener detección
    stopDetection();
  }
});

function onResults(results) {
  if (!isDetectionActive) return;

  if (!results.poseLandmarks) {
    poseResult.textContent = languageStrings[currentLanguage].noBody;
    headY = leftHandY = rightHandY = null;
    return;
  }

  // Actualizar variables GLOBALES con los landmarks
  headY = results.poseLandmarks[0].y;
  leftHandY = results.poseLandmarks[15].y;
  rightHandY = results.poseLandmarks[16].y;

  // Condición: brazos arriba (manos por encima de la cabeza)
  if (leftHandY < headY && rightHandY < headY) {
    poseResult.textContent = languageStrings[currentLanguage].poseDetected;

    const now = Date.now();
    if (
      !isGeneratingFeedback &&
      now - lastAutoFeedbackTime > MIN_FEEDBACK_INTERVAL &&
      !isSpeaking
    ) {
      captureAndSendFeedback();
      lastAutoFeedbackTime = now;
    }
  } else {
    poseResult.textContent = languageStrings[currentLanguage].notBothArms;
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
    currentLanguage === "es"
      ? "El usuario está manteniendo una pose de brazos arriba."
      : "The user is maintaining an arms-up yoga pose.";

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
      language: currentLanguage, // Enviar idioma actual al backend
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
      languageStrings[currentLanguage].errorFeedback,
      false
    );
  } finally {
    isGeneratingFeedback = false;
  }
}

function showLoadingMessage(isAuto) {
  const loadingId = "loading-" + Date.now();
  const strings = languageStrings[currentLanguage];

  const messageDiv = document.createElement("div");
  messageDiv.id = loadingId;
  messageDiv.className = "feedback-message loading";

  if (isAuto) {
    messageDiv.innerHTML = `
      <div class="auto-indicator">${strings.analyzing}</div>
      <div class="message-content">
        <div class="thinking-indicator">${strings.thinking}</div>
        <div class="spinner"></div>
      </div>
    `;
    messageDiv.style.borderLeft = "4px solid #FF9800";
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="thinking-indicator">${strings.thinking}</div>
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
    messageDiv.innerHTML = `<div class="auto-indicator">${languageStrings[currentLanguage].master}</div><div class="message-content">${message}</div>`;
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
      console.warn(
        currentLanguage === "es"
          ? "Error cerrando instancia anterior de Pose:"
          : "Error closing previous Pose instance:",
        e
      );
    }
  }

  pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 1,
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
          console.error(
            currentLanguage === "es"
              ? "Error en detección de pose:"
              : "Error in pose detection:",
            err
          );
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
    messageDiv.innerHTML = `<div class="auto-indicator">${languageStrings[currentLanguage].master}</div><div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #4CAF50";
  } else {
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  feedbackContainer.appendChild(messageDiv);
}

// Mensaje inicial
addFeedbackToHistory(languageStrings[currentLanguage].welcome, false);

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
  currentUtterance.lang = currentLanguage === "es" ? "es-MX" : "en-US";
  currentUtterance.rate = 0.9;
  currentUtterance.pitch = 1;
  currentUtterance.volume = 1;

  currentUtterance.onend = () => {
    isSpeaking = false;
    setTimeout(processSpeechQueue, 500);
  };

  speechSynthesis.speak(currentUtterance);
}

// Inicializar idioma
setLanguage("es");
