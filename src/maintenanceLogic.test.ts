import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularMetricasManutencao,
  calcularStatusOrdemPorPendencias,
  montarResponsaveisSelecionados,
  podeExcluirAtendimento,
  podeExcluirOrdem
} from "./maintenanceLogic";

describe("maintenance logic", () => {
  it("calcula indicadores operacionais do painel", () => {
    const metrics = calcularMetricasManutencao(
      {
        unidades: [{ id: 1 }],
        ordens: [
          { id: 1, status: "Pendente", prazoSla: "2026-07-18" },
          { id: 2, status: "Concluida", prazoSla: "2026-07-01" }
        ],
        atendimentos: [
          { id: 1, ordemId: 1, materiais: [] },
          { id: 2, ordemId: 1, materiais: [] }
        ],
        estoque: [
          { quantidade: 2, minimo: 3 },
          { quantidade: 8, minimo: 3 }
        ]
      },
      new Date("2026-07-20T12:00:00")
    );

    assert.deepEqual(metrics, {
      unidades: 1,
      ordensAbertas: 1,
      slaVencidas: 1,
      atendimentos: 2,
      atendimentosPorOs: 2,
      estoqueBaixo: 1
    });
  });

  it("mantem OS pendente ate todas as pendencias serem concluidas", () => {
    assert.equal(calcularStatusOrdemPorPendencias("Executado", ["Concluida", "Pendente"]), "Pendente");
    assert.equal(calcularStatusOrdemPorPendencias("Executado", ["Concluida", "Concluida"]), "Concluida");
  });

  it("marca atendimento parcial ou reagendado como pendencia da OS", () => {
    assert.equal(calcularStatusOrdemPorPendencias("Parcial", ["Aberta"]), "Pendente");
    assert.equal(calcularStatusOrdemPorPendencias("Reagendado", []), "Pendente");
  });

  it("bloqueia exclusoes que quebrariam historico ou estoque", () => {
    const atendimentos = [
      { id: 1, ordemId: 10, materiais: [] },
      { id: 2, ordemId: 11, materiais: ["Filtro | qtd: 1 | uso: consumo"] }
    ];

    assert.equal(podeExcluirOrdem(10, atendimentos), true);
    assert.equal(podeExcluirOrdem(11, atendimentos), false);
    assert.equal(podeExcluirOrdem(99, atendimentos), true);
    assert.equal(podeExcluirAtendimento(atendimentos[0]), true);
    assert.equal(podeExcluirAtendimento(atendimentos[1]), false);
  });

  it("normaliza responsaveis selecionados por cadastro", () => {
    assert.equal(
      montarResponsaveisSelecionados(["colaborador:Joao Silva", "terceirizado:Equipe Alfa"]),
      "Joao Silva, Equipe Alfa"
    );
    assert.equal(montarResponsaveisSelecionados([]), "A definir");
  });
});
