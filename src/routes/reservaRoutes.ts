import { Router } from "express";
import * as reservaController from "../controllers/reservaController";

const router = Router();

router.post("/", reservaController.criar); // Criar
router.get("/", reservaController.listar); // Ler (com filtros)
router.put("/:id", reservaController.atualizar); // Atualizar
router.patch("/:id/cancelar", reservaController.cancelar); // Cancelar (status)
router.delete("/:id", reservaController.excluir); // Excluir (remover)

export default router;
