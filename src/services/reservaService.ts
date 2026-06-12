import {
  Reserva,
  ReservaDoc,
  DURACAO_PADRAO_MIN,
  StatusReserva,
} from "../models/Reserva";
import { Mesa } from "../models/Mesa";
import { log } from "../utils/logger";

/**
 * Erro de regra de negócio. Usamos uma classe própria para o controller
 * conseguir diferenciar "erro do usuário" (400) de "erro do servidor" (500).
 */
export class RegraNegocioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegraNegocioError";
  }
}

/** Antecedência mínima exigida para criar uma reserva (1 hora). */
const ANTECEDENCIA_MINIMA_MS = 60 * 60 * 1000;

interface DadosReserva {
  nomeCliente: string;
  contatoCliente: string;
  numeroMesa: number;
  quantidadePessoas: number;
  dataHoraInicio: string | Date;
  duracaoMinutos?: number;
  observacoes?: string;
}

/**
 * Calcula qual DEVERIA ser o status de uma reserva com base no horário atual.
 * - antes do início          => reservado
 * - entre início e fim       => ocupado
 * - depois do fim            => finalizado
 * Reservas canceladas nunca mudam de status.
 */
export function calcularStatusPorTempo(
  inicio: Date,
  duracaoMin: number,
  statusAtual: StatusReserva
): StatusReserva {
  if (statusAtual === "cancelado") return "cancelado";

  const agora = Date.now();
  const fim = inicio.getTime() + duracaoMin * 60 * 1000;

  if (agora < inicio.getTime()) return "reservado";
  if (agora < fim) return "ocupado";
  return "finalizado";
}

/**
 * Verifica se um novo intervalo de horário conflita com reservas já existentes
 * na MESMA mesa. Dois intervalos [aIni, aFim) e [bIni, bFim) se sobrepõem
 * quando: aIni < bFim E bIni < aFim.
 *
 * @param ignorarId usado na atualização para não comparar a reserva com ela mesma.
 */
async function existeConflitoHorario(
  numeroMesa: number,
  inicio: Date,
  duracaoMin: number,
  ignorarId?: string
): Promise<boolean> {
  const fim = new Date(inicio.getTime() + duracaoMin * 60 * 1000);

  // Só reservas ativas ocupam a mesa (canceladas/finalizadas não contam).
  const query: Record<string, unknown> = {
    numeroMesa,
    status: { $in: ["reservado", "ocupado"] },
  };
  if (ignorarId) query._id = { $ne: ignorarId };

  const reservasDaMesa = await Reserva.find(query);

  return reservasDaMesa.some((r) => {
    const rIni = r.dataHoraInicio.getTime();
    const rFim = rIni + (r.duracaoMinutos ?? DURACAO_PADRAO_MIN) * 60 * 1000;
    return inicio.getTime() < rFim && rIni < fim.getTime();
  });
}

/** Valida todas as regras e cria a reserva. */
export async function criarReserva(dados: DadosReserva) {
  const inicio = new Date(dados.dataHoraInicio);
  const duracao = dados.duracaoMinutos ?? DURACAO_PADRAO_MIN;

  if (isNaN(inicio.getTime())) {
    throw new RegraNegocioError("Data/hora da reserva inválida.");
  }

  // REGRA: antecedência mínima de 1 hora.
  if (inicio.getTime() - Date.now() < ANTECEDENCIA_MINIMA_MS) {
    throw new RegraNegocioError(
      "A reserva deve ser feita com pelo menos 1 hora de antecedência."
    );
  }

  // REGRA: a mesa precisa existir.
  const mesa = await Mesa.findOne({ numero: dados.numeroMesa });
  if (!mesa) {
    throw new RegraNegocioError(`Mesa ${dados.numeroMesa} não existe.`);
  }

  // REGRA: a mesa precisa comportar a quantidade de pessoas.
  if (dados.quantidadePessoas > mesa.capacidade) {
    throw new RegraNegocioError(
      `A mesa ${mesa.numero} comporta no máximo ${mesa.capacidade} pessoas.`
    );
  }

  // REGRA: não pode haver outra reserva no mesmo horário para esta mesa.
  if (await existeConflitoHorario(dados.numeroMesa, inicio, duracao)) {
    throw new RegraNegocioError(
      "Já existe uma reserva para esta mesa nesse horário."
    );
  }

  const reserva = await Reserva.create({
    nomeCliente: dados.nomeCliente,
    contatoCliente: dados.contatoCliente,
    numeroMesa: dados.numeroMesa,
    quantidadePessoas: dados.quantidadePessoas,
    dataHoraInicio: inicio,
    duracaoMinutos: duracao,
    observacoes: dados.observacoes ?? "",
    status: "reservado",
  });

  log("CRIACAO", `Reserva ${reserva._id} criada na mesa ${reserva.numeroMesa}`);
  return reserva;
}

/** Lista reservas, opcionalmente filtrando por cliente, mesa, data ou status. */
export async function listarReservas(filtros: {
  cliente?: string;
  mesa?: string;
  data?: string;
  status?: string;
}) {
  const query: Record<string, unknown> = {};

  if (filtros.cliente) {
    // busca parcial e sem diferenciar maiúsculas/minúsculas
    query.nomeCliente = { $regex: filtros.cliente, $options: "i" };
  }
  if (filtros.mesa) query.numeroMesa = Number(filtros.mesa);
  if (filtros.status) query.status = filtros.status;
  if (filtros.data) {
    // todas as reservas dentro do dia informado (00:00 às 23:59)
    const inicioDia = new Date(filtros.data);
    const fimDia = new Date(filtros.data);
    fimDia.setHours(23, 59, 59, 999);
    query.dataHoraInicio = { $gte: inicioDia, $lte: fimDia };
  }

  const reservas = await Reserva.find(query).sort({ dataHoraInicio: 1 });

  // Antes de devolver, mantemos o status coerente com o horário atual.
  await sincronizarStatus(reservas);
  return reservas;
}

/** Atualiza os campos de uma reserva, revalidando as regras necessárias. */
export async function atualizarReserva(id: string, dados: Partial<DadosReserva>) {
  const reserva = await Reserva.findById(id);
  if (!reserva) throw new RegraNegocioError("Reserva não encontrada.");

  const numeroMesa = dados.numeroMesa ?? reserva.numeroMesa;
  const inicio = dados.dataHoraInicio
    ? new Date(dados.dataHoraInicio)
    : reserva.dataHoraInicio;
  const duracao = dados.duracaoMinutos ?? reserva.duracaoMinutos ?? DURACAO_PADRAO_MIN;
  const quantidade = dados.quantidadePessoas ?? reserva.quantidadePessoas;

  // Revalida capacidade da mesa.
  const mesa = await Mesa.findOne({ numero: numeroMesa });
  if (!mesa) throw new RegraNegocioError(`Mesa ${numeroMesa} não existe.`);
  if (quantidade > mesa.capacidade) {
    throw new RegraNegocioError(
      `A mesa ${mesa.numero} comporta no máximo ${mesa.capacidade} pessoas.`
    );
  }

  // Revalida conflito de horário (ignorando a própria reserva).
  if (await existeConflitoHorario(numeroMesa, inicio, duracao, id)) {
    throw new RegraNegocioError(
      "Já existe uma reserva para esta mesa nesse horário."
    );
  }

  // Aplica os campos enviados.
  reserva.nomeCliente = dados.nomeCliente ?? reserva.nomeCliente;
  reserva.contatoCliente = dados.contatoCliente ?? reserva.contatoCliente;
  reserva.numeroMesa = numeroMesa;
  reserva.quantidadePessoas = quantidade;
  reserva.dataHoraInicio = inicio;
  reserva.duracaoMinutos = duracao;
  if (dados.observacoes !== undefined) reserva.observacoes = dados.observacoes;

  await reserva.save();
  log("ATUALIZACAO", `Reserva ${reserva._id} atualizada`);
  return reserva;
}

/** Cancela uma reserva (muda o status para "cancelado"). */
export async function cancelarReserva(id: string) {
  const reserva = await Reserva.findById(id);
  if (!reserva) throw new RegraNegocioError("Reserva não encontrada.");

  reserva.status = "cancelado";
  await reserva.save();
  log("CANCELAMENTO", `Reserva ${reserva._id} cancelada`);
  return reserva;
}

/** Remove definitivamente uma reserva do banco. */
export async function excluirReserva(id: string) {
  const reserva = await Reserva.findByIdAndDelete(id);
  if (!reserva) throw new RegraNegocioError("Reserva não encontrada.");
  log("EXCLUSAO", `Reserva ${id} removida`);
  return reserva;
}

/**
 * Recalcula o status de cada reserva conforme o tempo e salva no banco
 * apenas quando o status mudou (evita gravações desnecessárias).
 */
async function sincronizarStatus(reservas: ReservaDoc[]): Promise<void> {
  for (const r of reservas) {
    const novo = calcularStatusPorTempo(
      r.dataHoraInicio,
      r.duracaoMinutos ?? DURACAO_PADRAO_MIN,
      r.status as StatusReserva
    );
    if (novo !== r.status) {
      r.status = novo;
      await r.save();
    }
  }
}
