import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { Mesa } from "../models/Mesa";
import { log } from "../utils/logger";

/**
 * Mesas iniciais do restaurante. Rode com:  npm run seed
 * Isso limpa a collection de mesas e recria estas.
 */
const mesasIniciais = [
  { numero: 1, capacidade: 2, localizacao: "salão" },
  { numero: 2, capacidade: 2, localizacao: "salão" },
  { numero: 3, capacidade: 4, localizacao: "salão" },
  { numero: 4, capacidade: 4, localizacao: "área interna" },
  { numero: 5, capacidade: 6, localizacao: "área interna" },
  { numero: 6, capacidade: 6, localizacao: "varanda" },
  { numero: 7, capacidade: 8, localizacao: "varanda" },
  { numero: 8, capacidade: 10, localizacao: "salão" },
];

async function seed() {
  await connectDB();

  await Mesa.deleteMany({}); // limpa as mesas existentes para evitar duplicatas
  await Mesa.insertMany(mesasIniciais);

  log("SEED", `${mesasIniciais.length} mesas inseridas com sucesso`);
  await mongoose.disconnect();
  process.exit(0);
}

seed();
