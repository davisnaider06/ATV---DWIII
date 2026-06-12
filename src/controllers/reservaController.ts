import { Request, Response } from "express";
import * as reservaService from "../services/reservaService";
import { RegraNegocioError } from "../services/reservaService";

/**
 * O controller é a "ponte" entre o HTTP e as regras de negócio:
 * lê a requisição, chama o service e devolve a resposta com o status correto.
 * Ele NÃO conhece regras de negócio — só traduz HTTP <-> service.
 */

/** Centraliza o tratamento de erros para não repetir try/catch em cada rota. */
function tratarErro(res: Response, error: unknown) {
  if (error instanceof RegraNegocioError) {
    // erro previsível do usuário -> 400 Bad Request
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
  if (error instanceof Error && error.name === "ValidationError") {
    // erro de validação do Mongoose -> 400
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
  // erro inesperado -> 500 Internal Server Error
  console.error(error);
  return res
    .status(500)
    .json({ sucesso: false, mensagem: "Erro interno no servidor." });
}

// POST /reservas
export async function criar(req: Request, res: Response) {
  try {
    const reserva = await reservaService.criarReserva(req.body);
    res.status(201).json({
      sucesso: true,
      mensagem: "Reserva criada com sucesso.",
      dados: reserva,
    });
  } catch (error) {
    tratarErro(res, error);
  }
}

// GET /reservas?cliente=&mesa=&data=&status=
export async function listar(req: Request, res: Response) {
  try {
    const reservas = await reservaService.listarReservas({
      cliente: req.query.cliente as string,
      mesa: req.query.mesa as string,
      data: req.query.data as string,
      status: req.query.status as string,
    });
    res.json({ sucesso: true, total: reservas.length, dados: reservas });
  } catch (error) {
    tratarErro(res, error);
  }
}

// PUT /reservas/:id
export async function atualizar(req: Request, res: Response) {
  try {
    const reserva = await reservaService.atualizarReserva(req.params.id, req.body);
    res.json({
      sucesso: true,
      mensagem: "Reserva atualizada com sucesso.",
      dados: reserva,
    });
  } catch (error) {
    tratarErro(res, error);
  }
}

// PATCH /reservas/:id/cancelar
export async function cancelar(req: Request, res: Response) {
  try {
    const reserva = await reservaService.cancelarReserva(req.params.id);
    res.json({
      sucesso: true,
      mensagem: "Reserva cancelada com sucesso.",
      dados: reserva,
    });
  } catch (error) {
    tratarErro(res, error);
  }
}

// DELETE /reservas/:id
export async function excluir(req: Request, res: Response) {
  try {
    await reservaService.excluirReserva(req.params.id);
    res.json({ sucesso: true, mensagem: "Reserva removida com sucesso." });
  } catch (error) {
    tratarErro(res, error);
  }
}
