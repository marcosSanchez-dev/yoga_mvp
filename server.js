// server.js
const app = require("./openai-proxy");
app.listen(process.env.PORT || 3001, () => {
  console.log(`✅ Proxy corriendo en puerto ${process.env.PORT || 3001}`);
});
