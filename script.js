const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const detectBtn = document.getElementById("detectBtn");
const feedbackBtn = document.getElementById("feedbackBtn");
const speakBtn = document.getElementById("speakBtn");
const poseResult = document.getElementById("poseResult");
const feedbackText = document.getElementById("feedbackText");

let pose;
let camera;

// Variables globales de pose para el feedback
let headY = null;
let leftHandY = null;
let rightHandY = null;

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
    detectBtn.disabled = false;
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

  // Mostrar coordenadas en consola para depuración
  console.log({ headY, leftHandY, rightHandY });

  // Condición: brazos arriba (manos por encima de la cabeza)
  if (leftHandY < headY && rightHandY < headY) {
    poseResult.textContent = "✅ Pose detectada: Brazos Arriba";
    feedbackBtn.disabled = false;
    speakBtn.disabled = false;

    // Ejecutar automáticamente feedback solo si no se ha dado ya
    if (!feedbackText.textContent.includes("Muy bien")) {
      requestFeedback("Ambas manos están por encima de la cabeza");
    }
  } else {
    poseResult.textContent = "❌ No estás levantando ambos brazos";
    feedbackBtn.disabled = true;
    speakBtn.disabled = true;
  }
}

async function requestFeedback(input) {
  try {
    const res = await fetch("/api/feedback", {
      // Agrega /api antes de /feedback
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    const feedback = data.output;

    feedbackText.textContent = feedback;
  } catch (err) {
    console.error("❌ Error al obtener feedback:", err.message);
    feedbackText.textContent = "Error al conectar con el maestro de yoga.";
  }
}

async function setupPose() {
  pose = new Pose({
    locateFile: (file) => {
      // Solución WASM: usar versión específica y evitar SIMD
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    useWebGL: true, // Forzar uso de WebGL2
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
  feedbackBtn.disabled = true; // Deshabilitar para evitar múltiples clics

  // Verificar si tenemos datos de la pose
  if (headY === null || leftHandY === null || rightHandY === null) {
    feedbackText.textContent = "Esperando datos de la pose...";
    feedbackBtn.disabled = false;
    return;
  }

  const input =
    leftHandY < headY && rightHandY < headY
      ? "Ambas manos están por encima de la cabeza"
      : "Las manos están por debajo de la cabeza";

  try {
    const res = await fetch("/api/feedback", {
      // Agrega /api antes de /feedback
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    const feedback = data.output;

    feedbackText.textContent = feedback;
  } catch (err) {
    console.error("❌ Error al obtener feedback:", err.message);
    feedbackText.textContent = "Error al conectar con el maestro de yoga.";
  } finally {
    feedbackBtn.disabled = false; // Rehabilitar el botón
  }
});

// Botón para hablar el feedback usando Web Speech API
speakBtn.addEventListener("click", () => {
  const text = feedbackText.textContent;

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
});
