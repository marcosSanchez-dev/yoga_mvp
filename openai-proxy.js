import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Habilita CORS para todas las rutas
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    methods: ["POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.post("/feedback", async (req, res) => {
  try {
    const { poseDescription, imageData, isAuto, language } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: "Imagen faltante" });
    }

    // Crear prompt dinámico basado en el tipo de solicitud
    const systemPrompt = isAuto
      ? language === "es"
        ? "Eres un maestro de yoga observando a un estudiante en tiempo real. Analiza su postura y da retroalimentación breve (1-2 oraciones), específica y constructiva. Señala un aspecto positivo y una pequeña mejora. Varía tus respuestas."
        : "You are a yoga teacher watching a student in real time. Analyze their posture and give brief feedback (1-2 sentences), specific and constructive. Point out one positive aspect and one small improvement. Vary your responses."
      : language === "es"
      ? "Eres un maestro de yoga dando feedback detallado. Analiza la postura del estudiante y ofrece sugerencias específicas para mejorar (3-4 oraciones). Sé técnico pero claro."
      : "You are a yoga teacher giving detailed feedback. Analyze the student's posture and offer specific suggestions for improvement (3-4 sentences). Be technical but clear.";

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
            text: poseDescription || "Estudiante manteniendo pose de yoga",
          },
          {
            type: "image_url",
            image_url: {
              url: imageData,
              detail: "high", // Alta resolución para mejor análisis
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
