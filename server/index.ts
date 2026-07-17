import { createClient, SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Status = "Aberta" | "Agendada" | "Em atendimento" | "Pendente" | "Concluida";
type Prioridade = "P1" | "P2" | "P3" | "P4";

type Unidade = {
  id: number;
  codigo: string;
  nome: string;
  cliente: string;
  contrato: string;
  projeto: string;
  municipio: string;
  status: string;
};

type Ordem = {
  id: number;
  unidadeId: number;
  protocolo: string;
  tipo: string;
  prioridade: Prioridade;
  status: Status;
  abertura: string;
  prazoSla: string;
  responsavel: string;
  descricao: string;
  pendencias: string[];
};

type Atendimento = {
  id: number;
  ordemId: number;
  data: string;
  equipe: string;
  status: "Executado" | "Parcial" | "Reagendado";
  relato: string;
  materiais: string[];
};

type EstoqueItem = {
  id: number;
  item: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
};

type Store = {
  unidades: Unidade[];
  ordens: Ordem[];
  atendimentos: Atendimento[];
  estoque: EstoqueItem[];
};

type Repository = {
  source: "supabase" | "json-store";
  getStore(): Promise<Store>;
  createOrdem(input: Record<string, unknown>): Promise<Ordem>;
  updateOrdemStatus(id: number, status: Status): Promise<Ordem | undefined>;
  createAtendimento(input: Record<string, unknown>): Promise<Atendimento>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.resolve(__dirname, "../data/store.json");

const app = express();
app.use(cors());
app.use(express.json());

function parseLines(value: unknown) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nextId<T extends { id: number }>(items: T[]) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function toDate(value: unknown) {
  return String(value || new Date().toISOString().slice(0, 10));
}

function slaState(ordem: Ordem) {
  if (ordem.status === "Concluida") return "concluida";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${ordem.prazoSla}T00:00:00`);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "vencida";
  if (diff <= 2) return "risco";
  return "no prazo";
}

function metricsFor(store: Store) {
  const abertas = store.ordens.filter((ordem) => ordem.status !== "Concluida");
  const slaVencidas = abertas.filter((ordem) => slaState(ordem) === "vencida");
  const estoqueBaixo = store.estoque.filter((item) => item.quantidade <= item.minimo);
  return {
    unidades: store.unidades.length,
    ordensAbertas: abertas.length,
    slaVencidas: slaVencidas.length,
    atendimentos: store.atendimentos.length,
    estoqueBaixo: estoqueBaixo.length
  };
}

async function readJsonStore(): Promise<Store> {
  const raw = await fs.readFile(storePath, "utf-8");
  return JSON.parse(raw) as Store;
}

async function writeJsonStore(store: Store) {
  await fs.writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function makeJsonRepository(): Repository {
  return {
    source: "json-store",
    getStore: readJsonStore,
    async createOrdem(input) {
      const store = await readJsonStore();
      const id = nextId(store.ordens);
      const ordem: Ordem = {
        id,
        unidadeId: Number(input.unidadeId),
        protocolo: `OS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`,
        tipo: String(input.tipo || "Corretiva"),
        prioridade: (input.prioridade as Prioridade) || "P3",
        status: "Aberta",
        abertura: new Date().toISOString().slice(0, 10),
        prazoSla: String(input.prazoSla),
        responsavel: String(input.responsavel || "A definir"),
        descricao: String(input.descricao || ""),
        pendencias: parseLines(input.pendencias)
      };
      store.ordens.unshift(ordem);
      await writeJsonStore(store);
      return ordem;
    },
    async updateOrdemStatus(id, status) {
      const store = await readJsonStore();
      const ordem = store.ordens.find((item) => item.id === id);
      if (!ordem) return undefined;
      ordem.status = status;
      await writeJsonStore(store);
      return ordem;
    },
    async createAtendimento(input) {
      const store = await readJsonStore();
      const atendimento: Atendimento = {
        id: nextId(store.atendimentos),
        ordemId: Number(input.ordemId),
        data: toDate(input.data),
        equipe: String(input.equipe || "Equipe interna"),
        status: (input.status as Atendimento["status"]) || "Executado",
        relato: String(input.relato || ""),
        materiais: parseLines(input.materiais)
      };
      store.atendimentos.unshift(atendimento);
      const ordem = store.ordens.find((item) => item.id === atendimento.ordemId);
      if (ordem) ordem.status = atendimento.status === "Executado" ? "Concluida" : "Pendente";
      await writeJsonStore(store);
      return atendimento;
    }
  };
}

function requireData<T>(data: T | null, error: unknown): T {
  if (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(message);
  }
  if (!data) throw new Error("Supabase nao retornou dados.");
  return data;
}

function mapOrdem(row: any): Ordem {
  return {
    id: Number(row.id),
    unidadeId: Number(row.unidade_id),
    protocolo: row.protocolo,
    tipo: row.tipo,
    prioridade: row.prioridade,
    status: row.status,
    abertura: row.abertura,
    prazoSla: row.prazo_sla,
    responsavel: row.responsavel,
    descricao: row.descricao,
    pendencias: (row.pendencias_ordem || []).map((item: any) => item.descricao)
  };
}

function makeSupabaseRepository(client: SupabaseClient): Repository {
  return {
    source: "supabase",
    async getStore() {
      const [unidadesResult, ordensResult, atendimentosResult, estoqueResult] = await Promise.all([
        client.from("unidades").select("*").order("nome"),
        client.from("ordens").select("*, pendencias_ordem(descricao)").order("id", { ascending: false }),
        client.from("atendimentos").select("*, atendimento_materiais(descricao)").order("id", { ascending: false }),
        client.from("estoque").select("*").order("item")
      ]);

      if (unidadesResult.error) throw unidadesResult.error;
      if (ordensResult.error) throw ordensResult.error;
      if (atendimentosResult.error) throw atendimentosResult.error;
      if (estoqueResult.error) throw estoqueResult.error;

      return {
        unidades: (unidadesResult.data || []).map((row: any) => ({
          id: Number(row.id),
          codigo: row.codigo,
          nome: row.nome,
          cliente: row.cliente,
          contrato: row.contrato,
          projeto: row.projeto,
          municipio: row.municipio,
          status: row.status
        })),
        ordens: (ordensResult.data || []).map(mapOrdem),
        atendimentos: (atendimentosResult.data || []).map((row: any) => ({
          id: Number(row.id),
          ordemId: Number(row.ordem_id),
          data: row.data,
          equipe: row.equipe,
          status: row.status,
          relato: row.relato,
          materiais: (row.atendimento_materiais || []).map((item: any) => item.descricao)
        })),
        estoque: (estoqueResult.data || []).map((row: any) => ({
          id: Number(row.id),
          item: row.item,
          categoria: row.categoria,
          unidade: row.unidade,
          quantidade: Number(row.quantidade),
          minimo: Number(row.minimo)
        }))
      };
    },
    async createOrdem(input) {
      const { count, error: countError } = await client.from("ordens").select("id", { count: "exact", head: true });
      if (countError) throw countError;
      const sequence = Number(count || 0) + 1;
      const row = {
        unidade_id: Number(input.unidadeId),
        protocolo: `OS-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
        tipo: String(input.tipo || "Corretiva"),
        prioridade: (input.prioridade as Prioridade) || "P3",
        status: "Aberta",
        abertura: new Date().toISOString().slice(0, 10),
        prazo_sla: String(input.prazoSla),
        responsavel: String(input.responsavel || "A definir"),
        descricao: String(input.descricao || "")
      };
      const { data, error } = await client.from("ordens").insert(row).select("*").single();
      const inserted = requireData(data, error);
      const pendencias = parseLines(input.pendencias);
      if (pendencias.length) {
        const { error } = await client.from("pendencias_ordem").insert(
          pendencias.map((descricao) => ({ ordem_id: inserted.id, descricao }))
        );
        if (error) throw error;
      }
      return { ...mapOrdem({ ...inserted, pendencias_ordem: pendencias.map((descricao) => ({ descricao })) }) };
    },
    async updateOrdemStatus(id, status) {
      const { data, error } = await client
        .from("ordens")
        .update({ status })
        .eq("id", id)
        .select("*, pendencias_ordem(descricao)")
        .maybeSingle();
      if (error) throw error;
      return data ? mapOrdem(data) : undefined;
    },
    async createAtendimento(input) {
      const row = {
        ordem_id: Number(input.ordemId),
        data: toDate(input.data),
        equipe: String(input.equipe || "Equipe interna"),
        status: (input.status as Atendimento["status"]) || "Executado",
        relato: String(input.relato || "")
      };
      const { data, error } = await client.from("atendimentos").insert(row).select("*").single();
      const inserted = requireData(data, error);
      const materiais = parseLines(input.materiais);
      if (materiais.length) {
        const { error: materialError } = await client.from("atendimento_materiais").insert(
          materiais.map((descricao) => ({ atendimento_id: inserted.id, descricao }))
        );
        if (materialError) throw materialError;
      }
      const nextStatus = inserted.status === "Executado" ? "Concluida" : "Pendente";
      const { error: statusError } = await client.from("ordens").update({ status: nextStatus }).eq("id", inserted.ordem_id);
      if (statusError) throw statusError;
      return {
        id: Number(inserted.id),
        ordemId: Number(inserted.ordem_id),
        data: inserted.data,
        equipe: inserted.equipe,
        status: inserted.status,
        relato: inserted.relato,
        materiais
      };
    }
  };
}

function makeRepository(): Repository {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return makeSupabaseRepository(createClient(url, serviceRoleKey, { auth: { persistSession: false } }));
  }
  return makeJsonRepository();
}

const repository = makeRepository();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, source: repository.source, accessMode: "sem escrita no Access" });
});

app.get("/api/bootstrap", async (_req, res, next) => {
  try {
    const store = await repository.getStore();
    res.json({ ...store, metrics: metricsFor(store) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ordens", async (req, res, next) => {
  try {
    res.status(201).json(await repository.createOrdem(req.body));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/ordens/:id/status", async (req, res, next) => {
  try {
    const ordem = await repository.updateOrdemStatus(Number(req.params.id), req.body.status);
    if (!ordem) return res.status(404).json({ error: "Ordem nao encontrada" });
    res.json(ordem);
  } catch (error) {
    next(error);
  }
});

app.post("/api/atendimentos", async (req, res, next) => {
  try {
    res.status(201).json(await repository.createAtendimento(req.body));
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

const port = Number(process.env.PORT || 4174);
app.listen(port, "127.0.0.1", () => {
  console.log(`API manutencao em http://127.0.0.1:${port} (${repository.source})`);
});
