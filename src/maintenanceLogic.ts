export type OrdemStatus = "Aberta" | "Agendada" | "Em atendimento" | "Pendente" | "Concluida";
export type AtendimentoStatus = "Executado" | "Parcial" | "Reagendado";
export type PendenciaStatus = "Aberta" | "Pendente" | "Concluida";

export type OrdemLike = {
  id: number;
  status: OrdemStatus;
  prazoSla: string;
};

export type AtendimentoLike = {
  id: number;
  ordemId: number;
  materiais: string[];
};

export type EstoqueLike = {
  quantidade: number;
  minimo: number;
};

export type MetricsInput = {
  unidades: unknown[];
  ordens: OrdemLike[];
  atendimentos: AtendimentoLike[];
  estoque: EstoqueLike[];
};

export type Metrics = {
  unidades: number;
  ordensAbertas: number;
  slaVencidas: number;
  atendimentos: number;
  atendimentosPorOs: number;
  estoqueBaixo: number;
};

export function getSlaTone(ordem: OrdemLike, hoje = new Date()): "ok" | "warn" | "danger" {
  if (ordem.status === "Concluida") return "ok";
  const today = new Date(hoje);
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${ordem.prazoSla}T00:00:00`);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "danger";
  if (diff <= 2) return "warn";
  return "ok";
}

export function calcularMetricasManutencao(input: MetricsInput, hoje = new Date()): Metrics {
  const abertas = input.ordens.filter((ordem) => ordem.status !== "Concluida");
  const ordensComAtendimento = new Set(input.atendimentos.map((atendimento) => atendimento.ordemId));
  return {
    unidades: input.unidades.length,
    ordensAbertas: abertas.length,
    slaVencidas: abertas.filter((ordem) => getSlaTone(ordem, hoje) === "danger").length,
    atendimentos: input.atendimentos.length,
    atendimentosPorOs: ordensComAtendimento.size ? Math.round((input.atendimentos.length / ordensComAtendimento.size) * 100) / 100 : 0,
    estoqueBaixo: input.estoque.filter((item) => item.quantidade <= item.minimo).length
  };
}

export function calcularStatusOrdemPorPendencias(statusAtendimento: AtendimentoStatus, pendencias: PendenciaStatus[]): OrdemStatus {
  if (pendencias.length > 0 && pendencias.every((status) => status === "Concluida")) return "Concluida";
  if (pendencias.some((status) => status !== "Aberta") || statusAtendimento === "Parcial" || statusAtendimento === "Reagendado") return "Pendente";
  if (statusAtendimento === "Executado" && pendencias.length === 0) return "Concluida";
  return "Em atendimento";
}

export function podeExcluirAtendimento(atendimento: AtendimentoLike): boolean {
  return atendimento.materiais.length === 0;
}

export function podeExcluirOrdem(ordemId: number, atendimentos: AtendimentoLike[]): boolean {
  return !atendimentos.some((atendimento) => atendimento.ordemId === ordemId);
}

export function montarResponsaveisSelecionados(values: string[]): string {
  return values
    .map((value) => value.split(":").slice(1).join(":").trim())
    .filter(Boolean)
    .join(", ") || "A definir";
}
