const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const toggleDetectBtn = document.getElementById("toggleDetectBtn");
const poseResult = document.getElementById("poseResult");
const feedbackContainer = document.getElementById("feedbackContainer");
const languageToggle = document.getElementById("languageToggle");
const poseReference = document.getElementById("poseReference");
const toggleReferenceBtn = document.getElementById("toggleReferenceBtn");

let pose;
let camera;
let canvas;
let ctx;
let stream = null;
let isDetectionActive = false;

// Landmarks de referencia para la pose ideal
let referenceLandmarks = null;
const REFERENCE_POSE = "armsUp";

// Landmarks de respaldo en caso de que el análisis de la imagen falle
const FALLBACK_LANDMARKS = new Array(33); // Crear array de 33 elementos
FALLBACK_LANDMARKS[0] = { x: 0.5, y: 0.15, visibility: 1 }; // cabeza
FALLBACK_LANDMARKS[11] = { x: 0.35, y: 0.3, visibility: 1 }; // hombro izquierdo
FALLBACK_LANDMARKS[12] = { x: 0.65, y: 0.3, visibility: 1 }; // hombro derecho
FALLBACK_LANDMARKS[13] = { x: 0.3, y: 0.15, visibility: 1 }; // codo izquierdo
FALLBACK_LANDMARKS[14] = { x: 0.7, y: 0.15, visibility: 1 }; // codo derecho
FALLBACK_LANDMARKS[15] = { x: 0.25, y: 0.05, visibility: 1 }; // muñeca izquierda
FALLBACK_LANDMARKS[16] = { x: 0.75, y: 0.05, visibility: 1 }; // muñeca derecha
FALLBACK_LANDMARKS[23] = { x: 0.4, y: 0.6, visibility: 1 }; // cadera izquierda
FALLBACK_LANDMARKS[24] = { x: 0.6, y: 0.6, visibility: 1 }; // cadera derecha

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

// Estado de visibilidad de referencia
let isReferenceVisible = true;

// Variables para sistema de puntuación
let userScoreElement = null;
let targetScoreElement = null;
let lastScore = 0;
const SCORE_HISTORY_LENGTH = 5;
let scoreHistory = [];
let scoreProblemPoints = [];

// Modo depuración
const DEBUG_MODE = true;
const REF_DEBUG_PREFIX = "[REF]";
const SIM_DEBUG_PREFIX = "[SIM]";

function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log("[DEBUG]", ...args);
  }
}

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
    languageBtn: "English",
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
  },
};

// Crear canvas para capturas
function setupCanvas() {
  canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx = canvas.getContext("2d");
  debugLog("Canvas configurado:", canvas.width, "x", canvas.height);
}

// Función para cambiar idioma
function setLanguage(lang) {
  currentLanguage = lang;
  const strings = languageStrings[lang];
  debugLog("Cambiando idioma a:", lang);

  // Actualizar textos estáticos
  languageToggle.textContent = strings.languageBtn;
  document.querySelector("h1").textContent =
    lang === "es" ? "🧘 Maestro de Yoga Virtual" : "🧘 Virtual Yoga Master";
  document.getElementById("referenceTitle").textContent =
    strings.referenceTitle;
  toggleReferenceBtn.textContent = isReferenceVisible
    ? strings.hideReference
    : strings.showReference;

  // Actualizar botones
  startBtn.textContent = strings.startCamera;
  toggleDetectBtn.textContent = isDetectionActive
    ? strings.stopDetection
    : strings.startDetection;
  poseResult.textContent = isDetectionActive
    ? strings.detecting
    : strings.stopped;

  // Actualizar etiquetas de similitud si existen
  const similarityLabels = document.querySelectorAll(".similarity-label");
  if (similarityLabels.length >= 2) {
    similarityLabels[0].textContent = strings.referenceScore;
    similarityLabels[2].textContent = strings.yourScore;
  }

  // Actualizar puntuaciones
  if (userScoreElement) {
    document.querySelector("#yourScoreLabel").textContent =
      strings.yourScoreLabel;
    document.querySelector("#targetScoreLabel").textContent =
      strings.targetScoreLabel;
  }

  // Actualizar imagen de referencia
  loadReferenceImage();

  // Actualizar mensajes en el contenedor de feedback
  updateFeedbackContainerLanguage();
}

// Cargar imagen de referencia
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

    // Si ya tenemos landmarks de referencia, dibujarlos
    if (referenceLandmarks) {
      drawReferenceLandmarks();
    } else {
      // Analizar en segundo plano
      debugLog(
        REF_DEBUG_PREFIX,
        "Imagen de referencia cargada. Iniciando análisis..."
      );
      await analyzeReferenceImage();

      // Reintentar después de 2 segundos si aún falla
      setTimeout(() => {
        if (!referenceLandmarks) {
          console.warn("Usando fallback landmarks después de timeout");
          referenceLandmarks = FALLBACK_LANDMARKS;
          drawReferenceLandmarks();
        }
      }, 3000);
    }
  };

  img.onerror = () => {
    if (loadingMessage) {
      loadingMessage.textContent =
        currentLanguage === "es"
          ? "Error cargando referencia"
          : "Error loading reference";
    }
    debugLog(REF_DEBUG_PREFIX, "Error al cargar la imagen de referencia");
  };

  img.src = `assets/pose_arms_up_${currentLanguage}.jpg`;
  debugLog("Cargando imagen de referencia:", img.src);
}

// Analizar imagen de referencia para extraer landmarks
async function analyzeReferenceImage() {
  debugLog(REF_DEBUG_PREFIX, "Iniciando análisis de imagen de referencia...");
  const img = document.getElementById("poseReference");

  if (!img || !img.complete || img.naturalWidth === 0) {
    debugLog(REF_DEBUG_PREFIX, "Imagen no válida o no cargada");
    return;
  }

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
        debugLog(
          REF_DEBUG_PREFIX,
          "Landmarks de referencia obtenidos:",
          referenceLandmarks
        );
        drawReferenceLandmarks();
        updateReferenceValues();
      } else {
        debugLog(
          REF_DEBUG_PREFIX,
          "No se detectaron landmarks en la imagen de referencia"
        );
      }
    });
  } catch (e) {
    debugLog(REF_DEBUG_PREFIX, "Error analizando imagen de referencia:", e);
  }
}

// Dibujar landmarks en la imagen de referencia
function drawReferenceLandmarks() {
  if (!referenceLandmarks) return;

  const img = document.getElementById("poseReference");
  if (!img) return;

  const refCanvas = document.createElement("canvas");
  const refCtx = refCanvas.getContext("2d");
  refCanvas.width = img.naturalWidth;
  refCanvas.height = img.naturalHeight;

  // Dibujar la imagen original
  refCtx.drawImage(img, 0, 0, refCanvas.width, refCanvas.height);

  // Dibujar landmarks
  refCtx.strokeStyle = "#00FF00";
  refCtx.lineWidth = 2;

  // Usar conexiones estándar si no están definidas
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

  // Dibujar conexiones - SÓLO SI EXISTEN AMBOS PUNTOS
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

  // Dibujar puntos - SÓLO SI EXISTEN
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

  // Actualizar la imagen con los landmarks dibujados
  img.src = refCanvas.toDataURL();
}

// Actualizar valores de referencia
function updateReferenceValues() {
  if (!referenceLandmarks) return;

  const refValues = document.getElementById("referenceValues");
  if (!refValues) return;

  refValues.innerHTML = "";

  // Definir puntos clave a mostrar
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

  // Encabezado
  refValues.innerHTML = `<div class="values-header">${languageStrings[currentLanguage].referenceScore}</div>`;

  // Llenar con los valores
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

// Actualizar valores del usuario en tiempo real
function updateUserValues(userLandmarks) {
  if (!userLandmarks) return;

  const userValues = document.getElementById("userValues");
  if (!userValues) return;

  userValues.innerHTML = "";

  // Definir puntos clave a mostrar
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

  // Encabezado
  userValues.innerHTML = `<div class="values-header">${languageStrings[currentLanguage].yourScore}</div>`;

  // Llenar con los valores
  Object.entries(keyPoints).forEach(([index, label]) => {
    const point = userLandmarks[parseInt(index)];
    if (point) {
      const row = document.createElement("div");
      row.className = "value-row";
      row.dataset.pointIndex = index; // Para resaltar puntos problemáticos
      row.innerHTML = `
        <span class="point-label">${label}:</span>
        <span>X: ${point.x.toFixed(2)}</span>
        <span>Y: ${point.y.toFixed(2)}</span>
      `;
      userValues.appendChild(row);

      // Aplicar resaltado si este punto es problemático
      if (scoreProblemPoints.includes(parseInt(index))) {
        row.classList.add("highlight");
      }
    }
  });
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

// Evento para mostrar/ocultar referencia
toggleReferenceBtn.addEventListener("click", () => {
  isReferenceVisible = !isReferenceVisible;

  const loadingMessage = document.getElementById("referenceLoading");
  if (poseReference) {
    poseReference.style.display = isReferenceVisible ? "block" : "none";
  }
  if (loadingMessage) {
    loadingMessage.style.display = isReferenceVisible ? "block" : "none";
  }

  toggleReferenceBtn.textContent = isReferenceVisible
    ? languageStrings[currentLanguage].hideReference
    : languageStrings[currentLanguage].showReference;
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

  // Resetear puntuación
  updateUserScore(0);
  scoreHistory = [];
  scoreProblemPoints = [];
  debugLog("Detección detenida. Puntuación reiniciada");
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
    debugLog("Detección iniciada");

    // Mostrar referencia si estaba oculta al iniciar detección
    if (!isReferenceVisible) {
      isReferenceVisible = true;
      if (poseReference) poseReference.style.display = "block";
      const loadingMessage = document.getElementById("referenceLoading");
      if (loadingMessage) loadingMessage.style.display = "block";
      toggleReferenceBtn.textContent =
        languageStrings[currentLanguage].hideReference;
    }
  } else {
    // Detener detección
    stopDetection();
  }
});

function onResults(results) {
  if (!isDetectionActive) return;

  if (!results.poseLandmarks) {
    debugLog("No se detectan landmarks en el cuerpo");
    poseResult.textContent = languageStrings[currentLanguage].noBody;
    headY = leftHandY = rightHandY = null;
    return;
  }

  // Actualizar variables GLOBALES con los landmarks
  headY = results.poseLandmarks[0].y;
  leftHandY = results.poseLandmarks[15].y;
  rightHandY = results.poseLandmarks[16].y;

  debugLog("Posición cabeza Y:", headY);
  debugLog("Posición mano izquierda Y:", leftHandY);
  debugLog("Posición mano derecha Y:", rightHandY);

  // Usar referencia o fallback si no hay landmarks
  const refLandmarks = referenceLandmarks || FALLBACK_LANDMARKS;

  // Calcular similitud en TODO momento (incluso cuando los brazos no están arriba)
  const similarityData = calculatePoseSimilarity(results.poseLandmarks);
  debugLog("Datos de similitud:", similarityData);

  if (similarityData) {
    updateSimilarityUI(similarityData.similarity);

    // Aumentar multiplicador para puntuaciones más altas
    const rawScore = similarityData.similarity * 7; // Más generoso (antes era 5)

    // Suavizar con promedio móvil usando pesos (más peso a los últimos valores)
    scoreHistory.push(rawScore);
    if (scoreHistory.length > SCORE_HISTORY_LENGTH) {
      scoreHistory.shift();
    }

    // Promedio ponderado (los últimos valores pesan más)
    const weights = [0.6, 0.7, 0.8, 1.0, 1.2]; // Más peso a valores recientes
    const weightedSum = scoreHistory.reduce((sum, score, index) => {
      const weight = weights[index] || 1.0;
      return sum + score * weight;
    }, 0);

    const weightSum = weights
      .slice(0, scoreHistory.length)
      .reduce((a, b) => a + b, 0);
    const weightedAvg = weightedSum / weightSum;

    // Limitar a 5 pero permitiendo valores más altos temporalmente
    const finalScore = Math.min(5, parseFloat(weightedAvg.toFixed(1)));

    // Solo actualizar UI si hay cambio significativo
    if (Math.abs(finalScore - lastScore) >= 0.05) {
      debugLog("Actualizando puntuación a:", finalScore);
      updateUserScore(finalScore);
      lastScore = finalScore;
      highlightProblemAreas(similarityData.pointErrors);
    }
  }

  // Actualizar valores del usuario
  updateUserValues(results.poseLandmarks);

  // Solo procesar si los brazos están arriba
  const areArmsUp = leftHandY < headY && rightHandY < headY;

  debugLog("Brazos arriba:", areArmsUp);

  if (areArmsUp) {
    let resultText = languageStrings[currentLanguage].poseDetected;

    if (similarityData !== null) {
      resultText += ` - ${languageStrings[currentLanguage].similarity}: ${(
        similarityData.similarity * 100
      ).toFixed(1)}%`;
    }

    poseResult.textContent = resultText;

    const now = Date.now();
    if (
      !isGeneratingFeedback &&
      now - lastAutoFeedbackTime > MIN_FEEDBACK_INTERVAL &&
      !isSpeaking
    ) {
      captureAndSendFeedback(results.poseLandmarks);
      lastAutoFeedbackTime = now;
    }
  } else {
    poseResult.textContent = languageStrings[currentLanguage].notBothArms;

    // Mostrar similitud incluso cuando los brazos no están arriba
    if (similarityData !== null) {
      poseResult.textContent += ` - ${
        languageStrings[currentLanguage].similarity
      }: ${(similarityData.similarity * 100).toFixed(1)}%`;
    }
  }
}

// Calcular similitud con pose de referencia (menos estricto)
function calculatePoseSimilarity(userLandmarks) {
  if (!userLandmarks) {
    debugLog(SIM_DEBUG_PREFIX, "Landmarks de usuario no definidos");
    return { similarity: 0, pointErrors: {} };
  }

  debugLog(SIM_DEBUG_PREFIX, "Calculando similitud...");

  // Usar referencia o fallback si no hay landmarks
  const ref = referenceLandmarks || FALLBACK_LANDMARKS;

  // Puntos clave para la pose de brazos arriba (incluyendo más puntos)
  const keyPoints = [0, 11, 12, 13, 14, 15, 16, 23, 24]; // Añadimos cabeza y caderas

  let totalError = 0;
  const pointErrors = {};
  let validPoints = 0;

  // Calcular el centro del cuerpo para normalizar
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
      // Umbral de visibilidad más bajo
      // Calcular posición relativa al centro del cuerpo
      const userRelX = userLandmarks[i].x - userBodyCenter.x;
      const userRelY = userLandmarks[i].y - userBodyCenter.y;

      const refRelX = ref[i].x - refBodyCenter.x;
      const refRelY = ref[i].y - refBodyCenter.y;

      // Calcular diferencia con tolerancia
      const dx = userRelX - refRelX;
      const dy = userRelY - refRelY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Aplicar pesos diferentes según la importancia del punto
      let weight = 1.0;
      if ([0, 15, 16].includes(i)) weight = 1.5; // Cabeza y manos más importantes
      if ([23, 24].includes(i)) weight = 0.7; // Caderas menos importantes

      pointErrors[i] = distance * weight;
      totalError += pointErrors[i];
      validPoints++;
    }
  }

  // Si no hay suficientes puntos válidos, retornar similitud 0
  if (validPoints < 5) {
    debugLog(SIM_DEBUG_PREFIX, "Puntos válidos insuficientes (<5)");
    return { similarity: 0, pointErrors };
  }

  // Normalizar error (0-1) y convertirlo a similitud
  const avgError = totalError / validPoints;
  const maxError = 0.6; // Aumentamos el error máximo permitido (era 0.3)

  // Función de suavizado para hacer la similitud más generosa
  const similarity = Math.max(0, 1 - avgError / maxError);

  // Aplicar curva de suavizado adicional
  const adjustedSimilarity = Math.pow(similarity, 0.7); // Hacemos la curva menos estricta

  debugLog(
    "Error promedio:",
    avgError,
    "Similitud base:",
    similarity,
    "Similitud ajustada:",
    adjustedSimilarity
  );

  return {
    similarity: adjustedSimilarity,
    pointErrors,
  };
}
// Actualizar UI de similitud
function updateSimilarityUI(similarity) {
  const similarityBar = document.getElementById("similarityBar");
  const similarityFill = document.getElementById("similarityFill");
  const similarityText = document.getElementById("similarityText");

  if (similarityBar && similarityFill && similarityText) {
    const percentage = Math.round(similarity * 100);
    similarityFill.style.width = `${percentage}%`;
    similarityText.textContent = `${percentage}%`;

    // Cambiar color según el porcentaje
    if (percentage < 40) {
      similarityFill.style.backgroundColor = "#f44336";
    } else if (percentage < 70) {
      similarityFill.style.backgroundColor = "#ff9800";
    } else {
      similarityFill.style.backgroundColor = "#4CAF50";
    }
  }
}

// Resaltar puntos problemáticos
function highlightProblemAreas(errors) {
  if (!errors) return;

  // Encontrar los 3 puntos con mayor error
  const problemPoints = Object.entries(errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((item) => parseInt(item[0]));

  scoreProblemPoints = problemPoints;

  // Actualizar UI
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

// Actualizar puntuación del usuario
function updateUserScore(score) {
  debugLog("Actualizando puntuación:", score);

  if (!userScoreElement) {
    debugLog("Elemento userScoreElement no encontrado");
    return;
  }

  userScoreElement.textContent = score.toFixed(1);
  userScoreElement.classList.add("score-change");

  // Cambiar color según puntuación
  if (score >= 4.0) {
    userScoreElement.style.color = "#4CAF50";
  } else if (score >= 2.0) {
    userScoreElement.style.color = "#FFC107";
  } else {
    userScoreElement.style.color = "#F44336";
  }

  // Remover clase de animación después de completar
  setTimeout(() => {
    userScoreElement.classList.remove("score-change");
  }, 500);
}

// Capturar imagen y enviar feedback
function captureAndSendFeedback(userLandmarks, isManual = false) {
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

  // Calcular similitud con referencia
  const similarityScore = referenceLandmarks
    ? calculatePoseSimilarity(userLandmarks).similarity
    : null;

  // Enviar para feedback
  requestFeedback(poseDescription, imageData, !isManual, similarityScore);
}

async function requestFeedback(
  poseDescription,
  imageData,
  isAuto = false,
  similarityScore = null
) {
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
      language: currentLanguage,
      similarityScore,
      currentScore: lastScore, // Incluir puntuación actual
    };

    const proxyUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3001/feedback"
        : "https://yoga-mvp-proxy.onrender.com/feedback";

    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Agrega este header para CORS simple
        "Sec-Fetch-Mode": "cors",
      },
      mode: "cors", // Asegura el modo CORS
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

// Inicializar elementos de puntuación
document.addEventListener("DOMContentLoaded", () => {
  userScoreElement = document.getElementById("userScore");
  targetScoreElement = document.getElementById("targetScore");

  debugLog("Elementos de puntuación:", {
    userScore: userScoreElement,
    targetScore: targetScoreElement,
  });

  if (!userScoreElement) {
    console.error("Elemento #userScore no encontrado en el DOM");
  }

  if (!targetScoreElement) {
    console.error("Elemento #targetScore no encontrado en el DOM");
  } else {
    targetScoreElement.textContent = "5.0";
  }

  // Inicializar puntuación
  updateUserScore(0);
  debugLog("Puntuación inicializada a 0.0");
});

// Inicializar idioma y referencia
setLanguage("es");
debugLog("Aplicación inicializada. Modo depuración activado");

// Definir conexiones POSE si no están disponibles
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
