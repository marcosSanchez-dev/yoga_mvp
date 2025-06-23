import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Habilita CORS para todas las rutas
const corsOptions = {
  origin: "*",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

app.post("/feedback", async (req, res) => {
  try {
    // Configura encabezados CORS aquí
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const {
      poseDescription,
      imageData,
      isAuto,
      language,
      similarityScore,
      currentScore,
    } = req.body;

    // Crear prompt dinámico basado en el tipo de solicitud e idioma
    let systemPrompt;
    if (isAuto) {
      systemPrompt =
        language === "es"
          ? `Eres un maestro de yoga observando a un estudiante en tiempo real. 
             Analiza su postura comparándola con la pose ideal de brazos arriba (Urdhva Hastasana). 
             El estudiante tiene una calificación actual de ${currentScore.toFixed(
               1
             )}/5.0.
             ${
               similarityScore
                 ? `La similitud calculada es ${(similarityScore * 100).toFixed(
                     0
                   )}%.`
                 : ""
             }
             Da retroalimentación breve (1-2 oraciones), específica y constructiva. 
             Señala un aspecto positivo y una pequeña mejora. Varía tus respuestas.`
          : `You are a yoga teacher watching a student in real time. 
             Analyze their posture comparing it to the ideal Arms Up pose (Urdhva Hastasana). 
             The student has a current score of ${currentScore.toFixed(1)}/5.0.
             ${
               similarityScore
                 ? `The calculated similarity is ${(
                     similarityScore * 100
                   ).toFixed(0)}%.`
                 : ""
             }
             Give brief feedback (1-2 sentences), specific and constructive. 
             Point out one positive aspect and one small improvement. Vary your responses.`;
    } else {
      systemPrompt =
        language === "es"
          ? `Eres un maestro de yoga dando feedback detallado. 
             Analiza la postura del estudiante comparándola con la pose ideal de brazos arriba (Urdhva Hastasana). 
             El estudiante tiene una calificación actual de ${currentScore.toFixed(
               1
             )}/5.0.
             ${
               similarityScore
                 ? `La similitud calculada es ${(similarityScore * 100).toFixed(
                     0
                   )}%.`
                 : ""
             }
             Ofrece sugerencias específicas para mejorar (3-4 oraciones). Sé técnico pero claro.`
          : `You are a yoga teacher giving detailed feedback. 
             Analyze the student's posture comparing it to the ideal Arms Up pose (Urdhva Hastasana). 
             The student has a current score of ${currentScore.toFixed(1)}/5.0.
             ${
               similarityScore
                 ? `The calculated similarity is ${(
                     similarityScore * 100
                   ).toFixed(0)}%.`
                 : ""
             }
             Offer specific suggestions for improvement (3-4 sentences). Be technical but clear.`;
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              poseDescription ||
              (language === "es"
                ? "Estudiante manteniendo pose de yoga"
                : "Student maintaining yoga pose"),
          },
          {
            type: "image_url",
            image_url: {
              url: imageData,
              detail: "high",
            },
          },
        ],
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo", // Usamos modelo con visión
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error de OpenAI:", response.status, errorText);
      return res.status(500).json({ error: "Error en OpenAI API" });
    }

    const data = await response.json();
    res.json({ output: data.choices[0].message.content });
  } catch (err) {
    console.error("Error en /feedback:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Proxy corriendo en http://localhost:${PORT}`);
});
