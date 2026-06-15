import { createApp } from "./app";

const PORT = process.env.PORT || 3000;

const { app } = createApp();

app.listen(PORT, () => {
  console.log(`[Server] Servidor escuchando en http://localhost:${PORT}`);
  console.log(`[Server] Ambiente: ${process.env.NODE_ENV || "development"}`);
});
