import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors"; // Añade esta importación

dotenv.config();

const app = express();

// Habilita CORS para todas las rutas
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
    methods: ["POST"], // Especifica los métodos permitidos
    allowedHeaders: ["Content-Type"], // Especifica los headers permitidos
  })
);

app.use(express.json());

app.post("/feedback", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: "Input faltante" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Actúa como un maestro de yoga profesional...",
          },
          {
            role: "user",
            content: input,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de OpenAI:", errorData);
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
