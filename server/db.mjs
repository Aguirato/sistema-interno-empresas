import { binding } from "./sqlite.mjs";
import initialFleet from "./initial-data.mjs";
function database() {
  if (!binding) throw new Error("Banco de dados indispon\xEDvel.");
  return binding;
}
async function initialize() {
  const db = database();
  if (await db.prepare("SELECT value FROM settings WHERE key='initial_fleet'").first()) return;
  const statements = [];
  for (const v of initialFleet.vehicles) {
    statements.push(db.prepare("INSERT INTO vehicles (id,model,plate,person,maintenance,due_date,maintenance_notes,notes,created_at,updated_at,deleted_at,revision) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='initial_fleet')").bind(v.id, v.model, v.plate, v.person, v.maintenance, v.due_date, v.maintenance_notes, v.notes, v.created_at, v.updated_at, v.deleted_at, v.revision));
  }
  for (const h of initialFleet.history) {
    statements.push(db.prepare("INSERT INTO history (id,vehicle_id,model,plate,person,maintenance,due_date,maintenance_notes,notes,started_at,ended_at,event) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='initial_fleet')").bind(h.id, h.vehicle_id, h.model, h.plate, h.person, h.maintenance, h.due_date, h.maintenance_notes, h.notes, h.started_at, h.ended_at, h.event));
  }
  statements.push(db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('initial_fleet',?)").bind((/* @__PURE__ */ new Date()).toISOString()));
  await db.batch(statements);
}
export {
  database,
  initialize
};
