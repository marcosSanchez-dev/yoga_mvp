// Configuración de partículas CSS
let particlesInterval;

function initParticles() {
  const container = document.getElementById("particles-bg");
  container.innerHTML = '<div class="particles-overlay"></div>';

  // Limpiar intervalo existente
  if (particlesInterval) clearInterval(particlesInterval);

  // Crear partículas iniciales
  createScoreParticles(lastScore);

  // Actualizar partículas cada segundo
  particlesInterval = setInterval(() => {
    createScoreParticles(lastScore);
  }, 1000);
}

function createScoreParticles(score) {
  const container = document.getElementById("particles-bg");

  // Limpiar partículas antiguas (excepto el overlay)
  const particles = container.querySelectorAll(".score-particle");
  particles.forEach((p) => {
    if (Date.now() - parseInt(p.dataset.created) > 5000) {
      p.remove();
    }
  });

  // Crear nuevas partículas basadas en el score
  const particleCount = Math.min(30, Math.floor(score * 8));
  const colors =
    score > 3.5
      ? ["#4CAF50", "#8BC34A", "#CDDC39"]
      : score > 2
      ? ["#FFC107", "#FF9800"]
      : ["#F44336", "#E91E63"];

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "score-particle";

    // Tamaño aleatorio
    const size = Math.random() * 10 + 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Posición inicial aleatoria en todo el viewport
    particle.style.setProperty("--start-top", Math.random() * 100);
    particle.style.setProperty("--start-left", Math.random() * 100);

    // Color basado en puntuación
    particle.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    const opacity = 0.5 + Math.random() * 0.5;
    particle.style.setProperty("--start-opacity", opacity);

    // Brillo
    particle.style.boxShadow = "0 0 8px currentColor";

    // Animación personalizada por puntuación
    const duration = 10 + score * 4 + Math.random() * 10;
    const moveX = (Math.random() - 0.5) * 100; // Movimiento horizontal
    const moveY = (Math.random() - 0.5) * 100; // Movimiento vertical

    particle.style.animation = `float ${duration}s linear infinite`;
    particle.style.setProperty("--move-x", `${moveX}px`);
    particle.style.setProperty("--move-y", `${moveY}px`);

    particle.dataset.created = Date.now();
    container.appendChild(particle);
  }
}

// Variables globales
const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const toggleDetectBtn = document.getElementById("toggleDetectBtn");
const poseResult = document.getElementById("poseResult");
const feedbackContainer = document.getElementById("feedbackContainer");
const languageToggle = document.getElementById("languageToggle");
const poseReference = document.getElementById("poseReference");
const activateVoiceBtn = document.getElementById("activateVoice");

let pose;
let camera;
let canvas;
let ctx;
let stream = null;
let isDetectionActive = false;
let isVoiceActive = false;

// Landmarks de referencia
let referenceLandmarks = null;
const REFERENCE_POSE = "armsUp";

// Landmarks de respaldo
const FALLBACK_LANDMARKS = new Array(33);
FALLBACK_LANDMARKS[0] = { x: 0.5, y: 0.15, visibility: 1 };
FALLBACK_LANDMARKS[11] = { x: 0.35, y: 0.3, visibility: 1 };
FALLBACK_LANDMARKS[12] = { x: 0.65, y: 0.3, visibility: 1 };
FALLBACK_LANDMARKS[13] = { x: 0.3, y: 0.15, visibility: 1 };
FALLBACK_LANDMARKS[14] = { x: 0.7, y: 0.15, visibility: 1 };
FALLBACK_LANDMARKS[15] = { x: 0.25, y: 0.05, visibility: 1 };
FALLBACK_LANDMARKS[16] = { x: 0.75, y: 0.05, visibility: 1 };
FALLBACK_LANDMARKS[23] = { x: 0.4, y: 0.6, visibility: 1 };
FALLBACK_LANDMARKS[24] = { x: 0.6, y: 0.6, visibility: 1 };

// Sistema de voz
let speechQueue = [];
let isSpeaking = false;
let currentUtterance = null;
let lastAudioEndTime = 0; // Tiempo en que terminó el último audio

// Control de feedback
let lastAutoFeedbackTime = 0;
const MIN_FEEDBACK_INTERVAL = 5000; // 5 segundos entre feedbacks
const MIN_SPEECH_INTERVAL = 3000; // 3 segundos mínimo entre feedbacks cuando voz activa
let isGeneratingFeedback = false;

// Sistema de puntuación
let userScoreElement = document.getElementById("userScore");
let targetScoreElement = document.getElementById("targetScore");
let lastScore = 0;
const SCORE_HISTORY_LENGTH = 5;
let scoreHistory = [];
let scoreProblemPoints = [];

// Configuración de idioma
let currentLanguage = "es";
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
    languageBtnFull: "English",
    languageBtnShort: "EN",
    hideReference: "Ocultar Referencia",
    showReference: "Mostrar Referencia",
    referenceTitle: "Pose Objetivo: Brazos Arriba",
    loadingReference: "Analizando pose de referencia...",
    similarity: "Similitud",
    referenceScore: "Referencia",
    yourScore: "Tu postura",
    nose: "Nariz",
    leftShoulder: "Hombro Izq",
    rightShoulder: "Hombro Der",
    leftElbow: "Codo Izq",
    rightElbow: "Codo Der",
    leftWrist: "Muñeca Izq",
    rightWrist: "Muñeca Der",
    leftHip: "Cadera Izq",
    rightHip: "Cadera Der",
    yourScoreLabel: "Tu calificación",
    targetScoreLabel: "Objetivo",
    voiceOn: "Voz activada",
    voiceOff: "Voz desactivada",
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
    languageBtnFull: "Español",
    languageBtnShort: "ES",
    hideReference: "Hide Reference",
    showReference: "Show Reference",
    referenceTitle: "Target Pose: Arms Up",
    loadingReference: "Analyzing reference pose...",
    similarity: "Similarity",
    referenceScore: "Reference",
    yourScore: "Your posture",
    nose: "Nose",
    leftShoulder: "Left Shoulder",
    rightShoulder: "Right Shoulder",
    leftElbow: "Left Elbow",
    rightElbow: "Right Elbow",
    leftWrist: "Left Wrist",
    rightWrist: "Right Wrist",
    leftHip: "Left Hip",
    rightHip: "Right Hip",
    yourScoreLabel: "Your Score",
    targetScoreLabel: "Target",
    voiceOn: "Voice activated",
    voiceOff: "Voice deactivated",
  },
};

// ================= FUNCIONES PRINCIPALES =================

function toggleVoice() {
  isVoiceActive = !isVoiceActive;

  if (isVoiceActive) {
    activateVoiceBtn.classList.add("voice-active");
    window.userInteracted = true;
    speakText(languageStrings[currentLanguage].voiceOn);
  } else {
    activateVoiceBtn.classList.remove("voice-active");
    // Cancelar cualquier audio en reproducción
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    // Limpiar cola de voz
    speechQueue = [];
    speakText(languageStrings[currentLanguage].voiceOff);
  }
}

// ===== SISTEMA MEJORADO DE VOZ =====
let currentAudio = null;

async function speakText(text) {
  if (!isVoiceActive || !text || !window.userInteracted) return;

  // Agregar a la cola
  speechQueue.push(text);
  processSpeechQueue();
}

async function processSpeechQueue() {
  if (isSpeaking || speechQueue.length === 0) return;

  isSpeaking = true;
  const text = speechQueue.shift();

  // Cancelar cualquier audio anterior
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  try {
    // Parámetros para voz de meditación profesional
    const voiceSettings = {
      stability: 0.75,
      similarity_boost: 0.9,
      style: 0.8,
      use_speaker_boost: true,
    };

    const voiceId = "pjcYQlDFKMbcOUp6F5GD";
    const apiKey = "sk_17a56f50cd59ad18cc4b3e483723d25cbf3b508f7dd09916";

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error en ElevenLabs:", response.status, errorData);

      // Si es error 401 (no autorizado), no reintentar
      if (response.status === 401) {
        throw new Error("API key inválida");
      }

      throw new Error(`API Error: ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    currentAudio = new Audio(audioUrl);

    currentAudio.play();
    currentAudio.onended = () => {
      currentAudio = null;
      isSpeaking = false;
      lastAudioEndTime = Date.now();
      processSpeechQueue(); // Procesar siguiente en cola
    };
  } catch (error) {
    console.error("Error con ElevenLabs:", error);

    // Fallback al sintetizador del navegador
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;
    utterance.rate = 0.85;
    utterance.volume = 1.0;

    // Buscar voz natural en el idioma actual
    const voices = speechSynthesis.getVoices();
    const lang = currentLanguage === "es" ? "es-ES" : "en-US";
    const naturalVoice = voices.find(
      (v) => v.lang === lang && v.name.includes("Natural")
    );

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      isSpeaking = false;
      lastAudioEndTime = Date.now();
      processSpeechQueue();
    };

    speechSynthesis.speak(utterance);
  }
}

function setLanguage(lang) {
  currentLanguage = lang;
  const strings = languageStrings[lang];

  languageToggle.querySelector(".full-text").textContent =
    strings.languageBtnFull;
  languageToggle.querySelector(".short-text").textContent =
    strings.languageBtnShort;

  document.querySelector("h1").textContent =
    lang === "es" ? "🧘 Maestro de Yoga Virtual" : "🧘 Virtual Yoga Master";

  startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10L19 7V17L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
  </svg><span>${stream ? strings.restartCamera : strings.startCamera}</span>`;

  toggleDetectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2"/>
    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg><span>${
    isDetectionActive ? strings.stopDetection : strings.startDetection
  }</span>`;

  activateVoiceBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3V19M8 8V16M16 6V18M20 9V15M4 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg><span>${isVoiceActive ? strings.voiceOff : strings.voiceOn}</span>`;

  document.getElementById("referenceTitle").textContent =
    strings.referenceTitle;
  document.getElementById("yourScoreLabel").textContent =
    strings.yourScoreLabel;
  document.getElementById("targetScoreLabel").textContent =
    strings.targetScoreLabel;

  updateFeedbackContainerLanguage();
  loadReferenceImage();

  // ✅ Traducción del popup de instrucciones
  if (lang === "en") {
    document.querySelector(".popup-content h2").textContent =
      "Usage Instructions";
    document.querySelector(".popup-content ol").innerHTML = `
      <li><strong>Start camera:</strong> Click "Start Camera" and allow access. Make sure you can see yourself in the video frame.</li>
      <li><strong>Activate voice (optional):</strong> Click "Activate Voice" if you want audio feedback. You will hear a confirmation when activated.</li>
      <li><strong>Start detection:</strong> Click "Start Detection" for the system to begin analyzing your posture.</li>
      <li><strong>Goal:</strong> Maintain the arms-up pose as similar as possible to the reference to reach a score of 5.0.</li>
      <li><strong>Tip:</strong> Try to maintain a stable posture for several seconds for better results.</li>
    `;
    document.querySelector(".credits p").innerHTML =
      'Application developed by <a href="https://www.linkedin.com/in/marcos-web-dev/" target="_blank">Marcos Sánchez</a>';
    document.getElementById("closePopup").textContent = "Got it";
  } else {
    document.querySelector(".popup-content h2").textContent =
      "Instrucciones de Uso";
    document.querySelector(".popup-content ol").innerHTML = `
      <li><strong>Iniciar cámara:</strong> Haz clic en "Iniciar Cámara" y permite el acceso a la cámara. Asegúrate de que puedas verte en el cuadro de video.</li>
      <li><strong>Activar voz (opcional):</strong> Haz clic en "Activar Voz" si deseas recibir retroalimentación auditiva. Escucharás una confirmación cuando se active.</li>
      <li><strong>Comenzar detección:</strong> Haz clic en "Iniciar Detección" para que el sistema comience a analizar tu postura.</li>
      <li><strong>Objetivo:</strong> Mantén la pose de brazos arriba lo más similar a la referencia posible para alcanzar una calificación de 5.0.</li>
      <li><strong>Consejo:</strong> Trata de mantener tu postura estable durante varios segundos para obtener mejores resultados.</li>
    `;
    document.querySelector(".credits p").innerHTML =
      'Aplicación desarrollada por <a href="https://www.linkedin.com/in/marcos-web-dev/" target="_blank">Marcos Sánchez</a>';
    document.getElementById("closePopup").textContent = "Entendido";
  }
}

function setupCanvas() {
  canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext("2d");
}

function loadReferenceImage() {
  const loadingMessage = document.getElementById("referenceLoading");
  if (!loadingMessage) return;

  loadingMessage.textContent =
    languageStrings[currentLanguage].loadingReference;
  loadingMessage.style.display = "block";
  poseReference.style.display = "none";

  const img = new Image();
  img.onload = async () => {
    poseReference.src = img.src;
    loadingMessage.style.display = "none";
    poseReference.style.display = "block";
    await analyzeReferenceImage();
  };

  img.onerror = () => {
    loadingMessage.textContent =
      currentLanguage === "es"
        ? "Error cargando referencia"
        : "Error loading reference";
  };

  img.src = `assets/pose_arms_up_${currentLanguage}.jpg`;
}

async function analyzeReferenceImage() {
  const img = document.getElementById("poseReference");
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const refCanvas = document.createElement("canvas");
  const refCtx = refCanvas.getContext("2d");
  refCanvas.width = img.naturalWidth;
  refCanvas.height = img.naturalHeight;
  refCtx.drawImage(img, 0, 0, refCanvas.width, refCanvas.height);

  try {
    const poseAnalyzer = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
    });

    poseAnalyzer.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
    });

    await poseAnalyzer.send({ image: refCanvas });
    poseAnalyzer.onResults((results) => {
      if (results.poseLandmarks) {
        referenceLandmarks = results.poseLandmarks;
        drawReferenceLandmarks();
        updateReferenceValues();
      }
    });
  } catch (e) {
    console.error("Error analizando imagen de referencia:", e);
    referenceLandmarks = FALLBACK_LANDMARKS;
    drawReferenceLandmarks();
  }
}

function drawReferenceLandmarks() {
  if (!referenceLandmarks) return;

  const img = document.getElementById("poseReference");
  if (!img) return;

  const refCanvas = document.createElement("canvas");
  const refCtx = refCanvas.getContext("2d");
  refCanvas.width = img.naturalWidth;
  refCanvas.height = img.naturalHeight;
  refCtx.drawImage(img, 0, 0, refCanvas.width, refCanvas.height);

  refCtx.strokeStyle = "#00FF00";
  refCtx.lineWidth = 2;

  const connections = window.POSE_CONNECTIONS || [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 7],
    [0, 4],
    [4, 5],
    [5, 6],
    [6, 8],
    [9, 10],
    [11, 12],
    [11, 13],
    [13, 15],
    [15, 17],
    [15, 19],
    [15, 21],
    [17, 19],
    [12, 14],
    [14, 16],
    [16, 18],
    [16, 20],
    [16, 22],
    [18, 20],
    [11, 23],
    [12, 24],
    [23, 24],
    [23, 25],
    [24, 26],
    [25, 27],
    [26, 28],
    [27, 29],
    [28, 30],
    [29, 31],
    [30, 32],
    [27, 31],
    [28, 32],
  ];

  for (const [start, end] of connections) {
    if (referenceLandmarks[start] && referenceLandmarks[end]) {
      refCtx.beginPath();
      refCtx.moveTo(
        referenceLandmarks[start].x * refCanvas.width,
        referenceLandmarks[start].y * refCanvas.height
      );
      refCtx.lineTo(
        referenceLandmarks[end].x * refCanvas.width,
        referenceLandmarks[end].y * refCanvas.height
      );
      refCtx.stroke();
    }
  }

  refCtx.fillStyle = "#FF0000";
  for (let i = 0; i < referenceLandmarks.length; i++) {
    const landmark = referenceLandmarks[i];
    if (landmark) {
      refCtx.beginPath();
      refCtx.arc(
        landmark.x * refCanvas.width,
        landmark.y * refCanvas.height,
        4,
        0,
        2 * Math.PI
      );
      refCtx.fill();
    }
  }

  img.src = refCanvas.toDataURL();
}

function updateReferenceValues() {
  if (!referenceLandmarks) return;
  const refValues = document.getElementById("referenceValues");
  if (!refValues) return;

  refValues.innerHTML = `<div class="values-header">${languageStrings[currentLanguage].referenceScore}</div>`;

  const keyPoints = {
    0: languageStrings[currentLanguage].nose,
    11: languageStrings[currentLanguage].leftShoulder,
    12: languageStrings[currentLanguage].rightShoulder,
    13: languageStrings[currentLanguage].leftElbow,
    14: languageStrings[currentLanguage].rightElbow,
    15: languageStrings[currentLanguage].leftWrist,
    16: languageStrings[currentLanguage].rightWrist,
    23: languageStrings[currentLanguage].leftHip,
    24: languageStrings[currentLanguage].rightHip,
  };

  Object.entries(keyPoints).forEach(([index, label]) => {
    const pointIndex = parseInt(index);
    if (referenceLandmarks[pointIndex]) {
      const point = referenceLandmarks[pointIndex];
      const row = document.createElement("div");
      row.className = "value-row";
      row.innerHTML = `
        <span class="point-label">${label}:</span>
        <span>X: ${point.x.toFixed(2)}</span>
        <span>Y: ${point.y.toFixed(2)}</span>
      `;
      refValues.appendChild(row);
    }
  });
}

function updateUserValues(userLandmarks) {
  if (!userLandmarks) return;
  const userValues = document.getElementById("userValues");
  if (!userValues) return;

  userValues.innerHTML = `<div class="values-header">${languageStrings[currentLanguage].yourScore}</div>`;

  const keyPoints = {
    0: languageStrings[currentLanguage].nose,
    11: languageStrings[currentLanguage].leftShoulder,
    12: languageStrings[currentLanguage].rightShoulder,
    13: languageStrings[currentLanguage].leftElbow,
    14: languageStrings[currentLanguage].rightElbow,
    15: languageStrings[currentLanguage].leftWrist,
    16: languageStrings[currentLanguage].rightWrist,
    23: languageStrings[currentLanguage].leftHip,
    24: languageStrings[currentLanguage].rightHip,
  };

  Object.entries(keyPoints).forEach(([index, label]) => {
    const point = userLandmarks[parseInt(index)];
    if (point) {
      const row = document.createElement("div");
      row.className = "value-row";
      row.dataset.pointIndex = index;
      row.innerHTML = `
        <span class="point-label">${label}:</span>
        <span>X: ${point.x.toFixed(2)}</span>
        <span>Y: ${point.y.toFixed(2)}</span>
      `;
      if (scoreProblemPoints.includes(parseInt(index))) {
        row.classList.add("highlight");
      }
      userValues.appendChild(row);
    }
  });
}

function updateFeedbackContainerLanguage() {
  const messages = feedbackContainer.querySelectorAll(".feedback-message");
  messages.forEach((msg) => {
    const content = msg.querySelector(".message-content");
    if (content) {
      const autoIndicator = msg.querySelector(".auto-indicator");
      if (autoIndicator) {
        autoIndicator.textContent = languageStrings[currentLanguage].master;
      }

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

function stopDetection() {
  if (camera) camera.stop();
  isDetectionActive = false;
  toggleDetectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2"/>
    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg><span>${languageStrings[currentLanguage].startDetection}</span>`;
  poseResult.textContent = languageStrings[currentLanguage].stopped;
  toggleDetectBtn.classList.remove("active");
  updateUserScore(0);
  scoreHistory = [];
  scoreProblemPoints = [];
}

function onResults(results) {
  if (!isDetectionActive) return;

  if (!results.poseLandmarks) {
    poseResult.textContent = languageStrings[currentLanguage].noBody;
    return;
  }

  const refLandmarks = referenceLandmarks || FALLBACK_LANDMARKS;
  const similarityData = calculatePoseSimilarity(results.poseLandmarks);

  if (similarityData) {
    updateSimilarityUI(similarityData.similarity);
    const rawScore = similarityData.similarity * 7;
    scoreHistory.push(rawScore);
    if (scoreHistory.length > SCORE_HISTORY_LENGTH) scoreHistory.shift();

    const weights = [0.6, 0.7, 0.8, 1.0, 1.2];
    const weightedSum = scoreHistory.reduce((sum, score, index) => {
      return sum + score * (weights[index] || 1.0);
    }, 0);
    const weightSum = weights
      .slice(0, scoreHistory.length)
      .reduce((a, b) => a + b, 0);
    const weightedAvg = weightedSum / weightSum;
    const finalScore = Math.min(5, parseFloat(weightedAvg.toFixed(1)));

    if (Math.abs(finalScore - lastScore) >= 0.05) {
      updateUserScore(finalScore);
      lastScore = finalScore;
      highlightProblemAreas(similarityData.pointErrors);
    }
  }

  updateUserValues(results.poseLandmarks);
  const areArmsUp =
    results.poseLandmarks[15].y < results.poseLandmarks[0].y &&
    results.poseLandmarks[16].y < results.poseLandmarks[0].y;

  if (areArmsUp) {
    let resultText = languageStrings[currentLanguage].poseDetected;
    if (similarityData) {
      resultText += ` - ${languageStrings[currentLanguage].similarity}: ${(
        similarityData.similarity * 100
      ).toFixed(1)}%`;
    }
    poseResult.textContent = resultText;

    const now = Date.now();
    const timeSinceLastFeedback = now - lastAutoFeedbackTime;
    const timeSinceLastAudio = now - lastAudioEndTime;

    // Condiciones mejoradas para enviar feedback
    const shouldSendFeedback =
      !isGeneratingFeedback &&
      timeSinceLastFeedback > MIN_FEEDBACK_INTERVAL &&
      (!isVoiceActive || timeSinceLastAudio > MIN_SPEECH_INTERVAL) &&
      !isSpeaking;

    if (shouldSendFeedback) {
      captureAndSendFeedback(results.poseLandmarks);
      lastAutoFeedbackTime = now;
    }
  } else {
    poseResult.textContent = languageStrings[currentLanguage].notBothArms;
    if (similarityData) {
      poseResult.textContent += ` - ${
        languageStrings[currentLanguage].similarity
      }: ${(similarityData.similarity * 100).toFixed(1)}%`;
    }
  }
}

function calculatePoseSimilarity(userLandmarks) {
  if (!userLandmarks) return { similarity: 0, pointErrors: {} };

  const ref = referenceLandmarks || FALLBACK_LANDMARKS;
  const keyPoints = [0, 11, 12, 13, 14, 15, 16, 23, 24];
  let totalError = 0;
  const pointErrors = {};
  let validPoints = 0;

  const userBodyCenter = {
    x:
      (userLandmarks[11].x +
        userLandmarks[12].x +
        userLandmarks[23].x +
        userLandmarks[24].x) /
      4,
    y:
      (userLandmarks[11].y +
        userLandmarks[12].y +
        userLandmarks[23].y +
        userLandmarks[24].y) /
      4,
  };

  const refBodyCenter = {
    x: (ref[11].x + ref[12].x + ref[23].x + ref[24].x) / 4,
    y: (ref[11].y + ref[12].y + ref[23].y + ref[24].y) / 4,
  };

  for (const i of keyPoints) {
    if (userLandmarks[i] && userLandmarks[i].visibility > 0.3 && ref[i]) {
      const userRelX = userLandmarks[i].x - userBodyCenter.x;
      const userRelY = userLandmarks[i].y - userBodyCenter.y;
      const refRelX = ref[i].x - refBodyCenter.x;
      const refRelY = ref[i].y - refBodyCenter.y;
      const dx = userRelX - refRelX;
      const dy = userRelY - refRelY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let weight = 1.0;
      if ([0, 15, 16].includes(i)) weight = 1.5;
      if ([23, 24].includes(i)) weight = 0.7;
      pointErrors[i] = distance * weight;
      totalError += pointErrors[i];
      validPoints++;
    }
  }

  if (validPoints < 5) return { similarity: 0, pointErrors };
  const avgError = totalError / validPoints;
  const maxError = 0.6;
  const similarity = Math.max(0, 1 - avgError / maxError);
  const adjustedSimilarity = Math.pow(similarity, 0.7);

  return {
    similarity: adjustedSimilarity,
    pointErrors,
  };
}

function updateSimilarityUI(similarity) {
  const similarityFill = document.getElementById("similarityFill");
  const similarityValue = document.getElementById("similarityValue");
  if (!similarityFill || !similarityValue) return;

  const percentage = Math.round(similarity * 100);
  similarityFill.style.width = `${percentage}%`;
  similarityValue.textContent = `${percentage}%`;

  // Animación de destello al cambiar
  similarityFill.classList.add("pulse");
  setTimeout(() => {
    similarityFill.classList.remove("pulse");
  }, 300);
}

function highlightProblemAreas(errors) {
  if (!errors) return;
  const problemPoints = Object.entries(errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([index]) => parseInt(index));

  scoreProblemPoints = problemPoints;
  const userValues = document.getElementById("userValues");
  if (userValues) {
    const rows = userValues.querySelectorAll(".value-row");
    rows.forEach((row) => {
      const index = parseInt(row.dataset.pointIndex);
      if (problemPoints.includes(index)) {
        row.classList.add("highlight");
      } else {
        row.classList.remove("highlight");
      }
    });
  }
}

function updateUserScore(score) {
  if (!userScoreElement) return;

  // Actualizar puntuación
  userScoreElement.textContent = score.toFixed(1);
  userScoreElement.classList.add("score-change");

  // Actualizar color basado en puntuación
  if (score >= 4.0) {
    userScoreElement.style.color = "#4CAF50";
    userScoreElement.style.textShadow = "0 0 10px rgba(76, 175, 80, 0.7)";
  } else if (score >= 2.0) {
    userScoreElement.style.color = "#FFC107";
    userScoreElement.style.textShadow = "0 0 10px rgba(255, 193, 7, 0.7)";
  } else {
    userScoreElement.style.color = "#F44336";
    userScoreElement.style.textShadow = "0 0 10px rgba(244, 67, 54, 0.7)";
  }

  // Actualizar partículas basado en la puntuación
  createScoreParticles(score);

  setTimeout(() => {
    userScoreElement.classList.remove("score-change");
  }, 500);
}

function captureAndSendFeedback(userLandmarks) {
  if (!canvas || !ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/jpeg", 0.8);
  const poseDescription =
    currentLanguage === "es"
      ? "El usuario está manteniendo una pose de brazos arriba."
      : "The user is maintaining an arms-up yoga pose.";
  const similarityScore = referenceLandmarks
    ? calculatePoseSimilarity(userLandmarks).similarity
    : null;
  requestFeedback(poseDescription, imageData, true, similarityScore);
}

async function requestFeedback(
  poseDescription,
  imageData,
  isAuto = false,
  similarityScore = null
) {
  if (isGeneratingFeedback) return;
  isGeneratingFeedback = true;
  const loadingMessage = showLoadingMessage(isAuto);

  try {
    const payload = {
      poseDescription,
      imageData,
      isAuto,
      language: currentLanguage,
      similarityScore,
      currentScore: lastScore,
    };

    const proxyUrl = "https://yoga-mvp.onrender.com/feedback";
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://yoga-mvp.vercel.app",
        "Sec-Fetch-Mode": "cors",
      },
      mode: "cors",
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    replaceLoadingMessage(loadingMessage, data.output, isAuto);
  } catch (err) {
    console.error("Error al obtener feedback:", err);
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

  feedbackContainer.insertBefore(messageDiv, feedbackContainer.firstChild);
  feedbackContainer.scrollTop = 0;
  return loadingId;
}

function replaceLoadingMessage(loadingId, message, isAuto) {
  const loadingElement = document.getElementById(loadingId);
  if (!loadingElement) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = "feedback-message";

  if (isAuto) {
    messageDiv.innerHTML = `
      <div class="auto-indicator">${languageStrings[currentLanguage].master}</div>
      <div class="message-content">${message}</div>
    `;
    messageDiv.style.borderLeft = "4px solid #4CAF50";

    // Solo enviar a voz si está activa
    if (isVoiceActive) {
      speakText(message);
    }
  } else {
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  loadingElement.replaceWith(messageDiv);

  const messages = feedbackContainer.querySelectorAll(
    ".feedback-message:not(.loading)"
  );
  if (messages.length > 5) {
    feedbackContainer.removeChild(messages[messages.length - 1]);
  }
}

function addFeedbackToHistory(message, isAuto) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "feedback-message";

  if (isAuto) {
    messageDiv.innerHTML = `
      <div class="auto-indicator">${languageStrings[currentLanguage].master}</div>
      <div class="message-content">${message}</div>
    `;
    messageDiv.style.borderLeft = "4px solid #4CAF50";
  } else {
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messageDiv.style.borderLeft = "4px solid #2196F3";
  }

  feedbackContainer.appendChild(messageDiv);
}

async function setupPose() {
  if (pose) {
    try {
      await pose.close();
    } catch (e) {
      console.warn("Error cerrando instancia anterior de Pose:", e);
    }
  }

  pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
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

  if (camera) camera.stop();
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

// ================= INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  setLanguage("es");

  userScoreElement = document.getElementById("userScore");
  targetScoreElement = document.getElementById("targetScore");
  targetScoreElement.textContent = "5.0";
  updateUserScore(0);

  // === POPUP DE INSTRUCCIONES ===
  const instructionsBtn = document.getElementById("instructionsBtn");
  const instructionsPopup = document.getElementById("instructionsPopup");
  const closePopup = document.getElementById("closePopup");

  instructionsBtn.addEventListener("click", () => {
    instructionsPopup.classList.add("active");
  });

  closePopup.addEventListener("click", () => {
    instructionsPopup.classList.remove("active");
  });

  instructionsPopup.addEventListener("click", (e) => {
    if (e.target === instructionsPopup) {
      instructionsPopup.classList.remove("active");
    }
  });

  let firstVisit = localStorage.getItem("firstVisit");
  if (!firstVisit) {
    setTimeout(() => {
      instructionsPopup.classList.add("active");
      localStorage.setItem("firstVisit", "true");
    }, 2000);
  }

  // === EVENTOS DE BOTONES ===
  activateVoiceBtn.addEventListener("click", toggleVoice);

  languageToggle.addEventListener("click", () => {
    const newLang = currentLanguage === "es" ? "en" : "es";
    setLanguage(newLang);
  });

  startBtn.addEventListener("click", async () => {
    try {
      if (isDetectionActive) stopDetection();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      video.srcObject = stream;
      startBtn.disabled = true;
      startBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 10L19 7V17L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
      </svg><span>${languageStrings[currentLanguage].restartCamera}</span>`;

      video.onloadedmetadata = () => {
        setupCanvas();
        toggleDetectBtn.disabled = false;
        toggleDetectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg><span>${languageStrings[currentLanguage].startDetection}</span>`;
      };
    } catch (err) {
      alert(
        currentLanguage === "es"
          ? "No se pudo acceder a la cámara: " + err.message
          : "Could not access camera: " + err.message
      );
    }
  });

  toggleDetectBtn.addEventListener("click", () => {
    if (!isDetectionActive) {
      setupPose();
      isDetectionActive = true;
      toggleDetectBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg><span>${languageStrings[currentLanguage].stopDetection}</span>`;
      poseResult.textContent = languageStrings[currentLanguage].detecting;
      toggleDetectBtn.classList.add("active");
    } else {
      stopDetection();
    }
  });

  // Mensaje de bienvenida
  addFeedbackToHistory(languageStrings[currentLanguage].welcome, false);

  if (!window.POSE_CONNECTIONS) {
    window.POSE_CONNECTIONS = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 7],
      [0, 4],
      [4, 5],
      [5, 6],
      [6, 8],
      [9, 10],
      [11, 12],
      [11, 13],
      [13, 15],
      [15, 17],
      [15, 19],
      [15, 21],
      [17, 19],
      [12, 14],
      [14, 16],
      [16, 18],
      [16, 20],
      [16, 22],
      [18, 20],
      [11, 23],
      [12, 24],
      [23, 24],
      [23, 25],
      [24, 26],
      [25, 27],
      [26, 28],
      [27, 29],
      [28, 30],
      [29, 31],
      [30, 32],
      [27, 31],
      [28, 32],
    ];
  }

  document.addEventListener("click", () => {
    if (!window.userInteracted) {
      window.userInteracted = true;
      const utterance = new SpeechSynthesisUtterance(" ");
      speechSynthesis.speak(utterance);
    }
  });
});
