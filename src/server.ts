import "dotenv/config"; // carrega as variáveis do .env logo no início
import express from "express";
import path from "path";
import { connectDB } from "./config/db";
import reservaRoutes from "./routes/reservaRoutes";
import mesaRoutes from "./routes/mesaRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE: permite ler JSON no corpo das requisições (req.body).
app.use(express.json());

// Serve o frontend estático (HTML/CSS/JS) da pasta /public.
app.use(express.static(path.join(__dirname, "..", "public")));

// ROTAS DA API (prefixadas com /api para separar do frontend).
app.use("/api/reservas", reservaRoutes);
app.use("/api/mesas", mesaRoutes);

// Sobe o servidor SOMENTE depois que o banco conectou.
async function iniciar() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

iniciar();
