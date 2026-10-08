import { database, initialize } from "./db.mjs";
import { statuses } from "./fleet.mjs";
const dynamic = "force-dynamic";
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function failure(error) {
  console.error("Fleet operation failed", error);
  const text = String(error);
  if (text.includes("UNIQUE constraint")) return json({ error: "Esta placa j\xE1 est\xE1 cadastrada. Use uma placa diferente." }, 409);
  return json({ error: "N\xE3o foi poss\xEDvel acessar a frota. Tente novamente. Seus dados no formul\xE1rio foram mantidos." }, 503);
}
async function GET() {
  try {
    await initialize();
    const db = database();
    const [vehicles, history] = await db.batch([db.prepare("SELECT * FROM vehicles ORDER BY created_at,id"), db.prepare("SELECT * FROM history ORDER BY started_at DESC,id")]);
    return json({ vehicles: vehicles.results, history: history.results });
  } catch (e) {
    return failure(e);
  }
}
async function POST(request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return json({ error: "Origem n\xE3o permitida." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Formato inv\xE1lido." }, 415);
    const raw = await request.text();
    if (raw.length > 3e4) return json({ error: "Conte\xFAdo muito longo." }, 413);
    let b;
    try {
      b = JSON.parse(raw);
    } catch {
      return json({ error: "Dados inv\xE1lidos." }, 400);
    }
    if (!b || typeof b !== "object") return json({ error: "Dados inv\xE1lidos." }, 400);
    const db = database();
    await initialize();
    const action = b.action;
    if (!["create", "update", "delete"].includes(action)) return json({ error: "A\xE7\xE3o inv\xE1lida." }, 400);
    let existing = null;
    if (action !== "create") {
      if (typeof b.id !== "string" || !Number.isInteger(b.revision)) return json({ error: "Ve\xEDculo inv\xE1lido." }, 400);
      existing = await db.prepare("SELECT * FROM vehicles WHERE id=? AND deleted_at IS NULL").bind(b.id).first();
      if (!existing) return json({ error: "Este ve\xEDculo n\xE3o est\xE1 mais na frota." }, 404);
      if (existing.revision !== b.revision) return json({ error: "Este ve\xEDculo foi alterado em outra sess\xE3o. Atualize a frota e tente novamente." }, 409);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString(), token = crypto.randomUUID();
    const id = existing?.id ?? crypto.randomUUID();
    if (action === "delete") {
      const result = await db.batch([db.prepare("UPDATE vehicles SET deleted_at=?,updated_at=?,mutation_token=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL").bind(now, now, token, id, b.revision), db.prepare("UPDATE history SET ended_at=? WHERE vehicle_id=? AND ended_at IS NULL AND EXISTS (SELECT 1 FROM vehicles WHERE id=? AND mutation_token=? AND revision=?)").bind(now, id, id, token, b.revision + 1)]);
      if (!result[0].meta.changes) return json({ error: "O ve\xEDculo foi alterado. Atualize a frota e tente novamente." }, 409);
      return json({ ok: true });
    }
    for (const key of ["model", "plate", "person", "maintenance", "due_date", "maintenance_notes", "notes"]) {
      if (typeof b[key] !== "string") return json({ error: "Preencha os campos do ve\xEDculo." }, 400);
    }
    const model = b.model.trim(), plate = b.plate.toUpperCase().replace(/[\s-]/g, ""), person = b.person.trim().replace(/\s+/g, " "), maintenance = b.maintenance, due = b.due_date, mnotes = b.maintenance_notes.trim(), notes = b.notes.trim();
    if (!model || model.length > 80) return json({ error: "Informe um modelo com at\xE9 80 caracteres." }, 400);
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) return json({ error: "Informe uma placa v\xE1lida, como ABC1D23 ou ABC1D23." }, 400);
    if (person.length > 100 || mnotes.length > 4e3 || notes.length > 4e3) return json({ error: "Nome ou observa\xE7\xF5es acima do limite permitido." }, 400);
    if (!Object.prototype.hasOwnProperty.call(statuses, maintenance)) return json({ error: "Selecione a situa\xE7\xE3o de manuten\xE7\xE3o." }, 400);
    if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(due)) || new Date(due).toISOString().slice(0, 10) !== due)) return json({ error: "Informe uma data v\xE1lida para a manuten\xE7\xE3o." }, 400);
    if (["pending", "in_progress"].includes(maintenance) && !mnotes) return json({ error: "Descreva a manuten\xE7\xE3o necess\xE1ria." }, 400);
    if (existing && [model, plate, person, maintenance, due, mnotes, notes].every((v, i) => v === [existing.model, existing.plate, existing.person, existing.maintenance, existing.due_date, existing.maintenance_notes, existing.notes][i])) return json({ ok: true });
    const event = !existing ? "Ve\xEDculo cadastrado" : existing.person !== person ? person ? "Respons\xE1vel alterado" : "Ve\xEDculo devolvido" : existing.maintenance !== maintenance ? maintenance === "ok" ? "Manuten\xE7\xE3o em dia" : "Manuten\xE7\xE3o atualizada" : "Cadastro atualizado";
    if (action === "create") {
      await db.batch([db.prepare("INSERT INTO vehicles (id,model,plate,person,maintenance,due_date,maintenance_notes,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, model, plate, person, maintenance, due, mnotes, notes, now, now), db.prepare("INSERT INTO history (id,vehicle_id,model,plate,person,maintenance,due_date,maintenance_notes,notes,started_at,event) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, model, plate, person, maintenance, due, mnotes, notes, now, event)]);
    } else {
      const result = await db.batch([db.prepare("UPDATE vehicles SET model=?,plate=?,person=?,maintenance=?,due_date=?,maintenance_notes=?,notes=?,updated_at=?,mutation_token=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL").bind(model, plate, person, maintenance, due, mnotes, notes, now, token, id, b.revision), db.prepare("UPDATE history SET ended_at=? WHERE vehicle_id=? AND ended_at IS NULL AND EXISTS (SELECT 1 FROM vehicles WHERE id=? AND revision=? AND mutation_token=?)").bind(now, id, id, b.revision + 1, token), db.prepare("INSERT INTO history (id,vehicle_id,model,plate,person,maintenance,due_date,maintenance_notes,notes,started_at,event) SELECT ?,id,model,plate,person,maintenance,due_date,maintenance_notes,notes,updated_at,? FROM vehicles WHERE id=? AND revision=? AND mutation_token=? AND deleted_at IS NULL").bind(crypto.randomUUID(), event, id, b.revision + 1, token)]);
      if (!result[0].meta.changes) return json({ error: "O ve\xEDculo foi alterado. Atualize a frota e tente novamente." }, 409);
    }
    return json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
export {
  GET,
  POST,
  dynamic
};
