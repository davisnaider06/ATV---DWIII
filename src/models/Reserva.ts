import { Schema, model, InferSchemaType, HydratedDocument } from "mongoose";

/** Os quatro estados possíveis de uma reserva (exigência da prova). */
export const STATUS_RESERVA = [
  "reservado", // agendada para o futuro
  "ocupado", // está acontecendo agora
  "finalizado", // horário já encerrou
  "cancelado", // cancelada pelo usuário
] as const;

export type StatusReserva = (typeof STATUS_RESERVA)[number];

/** Duração padrão de uma reserva, em minutos (1h30 = 90 min). */
export const DURACAO_PADRAO_MIN = 90;

const reservaSchema = new Schema(
  {
    nomeCliente: {
      type: String,
      required: [true, "O nome do cliente é obrigatório"],
      trim: true,
    },
    contatoCliente: {
      type: String,
      required: [true, "O contato do cliente é obrigatório"],
      trim: true,
    },
    numeroMesa: {
      type: Number,
      required: [true, "O número da mesa é obrigatório"],
    },
    quantidadePessoas: {
      type: Number,
      required: [true, "A quantidade de pessoas é obrigatória"],
      min: [1, "A reserva deve ter pelo menos 1 pessoa"],
    },
    dataHoraInicio: {
      type: Date,
      required: [true, "A data e hora da reserva são obrigatórias"],
    },
    duracaoMinutos: {
      type: Number,
      default: DURACAO_PADRAO_MIN,
      min: [1, "A duração deve ser positiva"],
    },
    observacoes: {
      type: String,
      trim: true,
      default: "", // campo opcional
    },
    status: {
      type: String,
      enum: STATUS_RESERVA,
      default: "reservado",
    },
  },
  { timestamps: true }
);

/**
 * Campo VIRTUAL: não fica salvo no banco, é calculado na hora.
 * dataHoraFim = início + duração. Útil para checar conflitos de horário.
 */
reservaSchema.virtual("dataHoraFim").get(function () {
  const inicio = this.dataHoraInicio as Date;
  const duracao = (this.duracaoMinutos as number) ?? DURACAO_PADRAO_MIN;
  return new Date(inicio.getTime() + duracao * 60 * 1000);
});

// Garante que os virtuais apareçam quando convertemos o documento para JSON.
reservaSchema.set("toJSON", { virtuals: true });
reservaSchema.set("toObject", { virtuals: true });

export type IReserva = InferSchemaType<typeof reservaSchema>;

/** Documento "hidratado" = dados + métodos do Mongoose (save, etc.). */
export type ReservaDoc = HydratedDocument<IReserva>;

export const Reserva = model("Reserva", reservaSchema);
