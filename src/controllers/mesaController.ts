import { Request, Response } from "express";
import { Mesa } from "../models/Mesa";
import { Reserva, DURACAO_PADRAO_MIN, StatusReserva } from "../models/Reserva";
import { calcularStatusPorTempo } from "../services/reservaService";
import { log } from "../utils/logger";

// GET /mesas  -> lista simples de mesas
export async function listar(_req: Request, res: Response) {
  try {
    const mesas = await Mesa.find().sort({ numero: 1 });
    res.json({ sucesso: true, total: mesas.length, dados: mesas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao listar mesas." });
  }
}

// POST /mesas  -> cadastra uma mesa
export async function criar(req: Request, res: Response) {
  try {
    const mesa = await Mesa.create(req.body);
    log("CRIACAO", `Mesa ${mesa.numero} cadastrada`);
    res.status(201).json({
      sucesso: true,
      mensagem: "Mesa cadastrada com sucesso.",
      dados: mesa,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return res.status(400).json({ sucesso: false, mensagem: error.message });
    }
    // erro de chave duplicada (número de mesa já existe)
    if (error instanceof Error && (error as any).code === 11000) {
      return res
        .status(400)
        .json({ sucesso: false, mensagem: "Já existe uma mesa com esse número." });
    }
    console.error(error);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao cadastrar mesa." });
  }
}

/**
 * GET /mesas/mapa
 * Retorna cada mesa com o seu status ATUAL, alimentando o mapa visual:
 *   - disponível (verde): nenhuma reserva ativa agora
 *   - reservado (amarelo): há reserva agendada para hoje, mas não no horário atual
 *   - ocupado (vermelho): há reserva acontecendo neste momento
 * Também devolve a reserva atual/próxima de cada mesa para exibir nos detalhes.
 */
export async function mapa(_req: Request, res: Response) {
  try {
    const mesas = await Mesa.find().sort({ numero: 1 });

    // pega todas as reservas que ainda "valem" (não canceladas/finalizadas)
    const reservasAtivas = await Reserva.find({
      status: { $in: ["reservado", "ocupado"] },
    }).sort({ dataHoraInicio: 1 });

    const resultado = mesas.map((mesa) => {
      const reservasDaMesa = reservasAtivas.filter(
        (r) => r.numeroMesa === mesa.numero
      );

      let statusMesa: "disponivel" | "reservado" | "ocupado" = "disponivel";
      let reservaRelevante = null;

      for (const r of reservasDaMesa) {
        const statusAtual = calcularStatusPorTempo(
          r.dataHoraInicio,
          r.duracaoMinutos ?? DURACAO_PADRAO_MIN,
          r.status as StatusReserva
        );
        if (statusAtual === "ocupado") {
          statusMesa = "ocupado"; // ocupado tem prioridade máxima
          reservaRelevante = r;
          break;
        }
        if (statusAtual === "reservado") {
          statusMesa = "reservado";
          if (!reservaRelevante) reservaRelevante = r;
        }
      }

      return {
        numero: mesa.numero,
        capacidade: mesa.capacidade,
        localizacao: mesa.localizacao,
        status: statusMesa,
        reserva: reservaRelevante,
      };
    });

    res.json({ sucesso: true, dados: resultado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao gerar mapa." });
  }
}
