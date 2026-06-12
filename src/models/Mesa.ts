import { Schema, model, InferSchemaType } from "mongoose";

/**
 * MESA
 * Representa uma mesa física do restaurante.
 * Campos exigidos pela prova: número, capacidade e localização.
 */
const mesaSchema = new Schema(
  {
    numero: {
      type: Number,
      required: [true, "O número da mesa é obrigatório"],
      unique: true, // não existem duas mesas com o mesmo número
      min: [1, "O número da mesa deve ser positivo"],
    },
    capacidade: {
      type: Number,
      required: [true, "A capacidade é obrigatória"],
      min: [1, "A capacidade deve ser de pelo menos 1 pessoa"],
    },
    localizacao: {
      type: String,
      required: [true, "A localização é obrigatória"],
      enum: {
        values: ["salão", "varanda", "área interna"],
        message: "Localização inválida: {VALUE}",
      },
    },
  },
  { timestamps: true } // cria automaticamente createdAt / updatedAt
);

// O TypeScript "deduz" o tipo a partir do schema — sem duplicar a definição.
export type IMesa = InferSchemaType<typeof mesaSchema>;

export const Mesa = model("Mesa", mesaSchema);
