import mongoose from "mongoose";

/**
 * Conecta a aplicação ao MongoDB usando a string de conexão do .env.
 * Se a conexão falhar, encerramos o processo: não faz sentido o servidor
 * subir sem banco, já que TODOS os dados ficam no MongoDB.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI não definida no arquivo .env");
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB conectado (banco: reserva)");
  } catch (error) {
    console.error("❌ Erro ao conectar no MongoDB:", error);
    process.exit(1); // encerra o app — sem banco não há sistema
  }
}
