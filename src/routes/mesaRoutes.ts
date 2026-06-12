import { Router } from "express";
import * as mesaController from "../controllers/mesaController";

const router = Router();

router.get("/", mesaController.listar); // listar mesas
router.get("/mapa", mesaController.mapa); // mapa visual com status
router.post("/", mesaController.criar); // cadastrar mesa

export default router;
