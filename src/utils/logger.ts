/**
 * Logger bem simples: registra ações importantes no console com data/hora.
 * A prova pede "registro básico de logs (criação, atualização, cancelamento)".
 */
export function log(acao: string, detalhe: string): void {
  const agora = new Date().toISOString();
  console.log(`[${agora}] ${acao} -> ${detalhe}`);
}
