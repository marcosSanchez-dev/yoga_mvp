// script.js completo corregido
const video = document.getElementById("videoElement");
const startBtn = document.getElementById("startBtn");
const detectBtn = document.getElementById("detectBtn");
const feedbackBtn = document.getElementById("feedbackBtn");
const speakBtn = document.getElementById("speakBtn");

startBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    detectBtn.disabled = false;
  } catch (err) {
    alert("No se pudo acceder a la cámara: " + err.message);
  }
});

let pose;
let camera;

const poseResult = document.getElementById("poseResult");

function onResults(results) {
  if (!results.poseLandmarks) {
    poseResult.textContent = "❌ No se detecta el cuerpo";
    return;
  }

  const headY = results.poseLandmarks[0].y;
  const leftHandY = results.poseLandmarks[15].y;
  const rightHandY = results.poseLandmarks[16].y;

  console.log({ headY, leftHandY, rightHandY });

  if (leftHandY < headY && rightHandY < headY) {
    poseResult.textContent = "✅ Pose detectada: Brazos Arriba";
    feedbackBtn.disabled = false;
    speakBtn.disabled = false;
  } else {
    poseResult.textContent = "❌ No estás levantando ambos brazos";
    feedbackBtn.disabled = true;
    speakBtn.disabled = true;
  }
}

async function setupPose() {
  // Configuración CORREGIDA (versión 0.5)
  pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`, // Versión actualizada
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults(onResults);

  camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

detectBtn.addEventListener("click", () => {
  setupPose();
});
