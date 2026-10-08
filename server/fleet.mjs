const statuses = { unknown: "N\xE3o informada", ok: "Em dia", pending: "Manuten\xE7\xE3o pendente", in_progress: "Em manuten\xE7\xE3o" };
const clean = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const day = (s) => s ? new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(s)) : "";
const dateLabel = (s) => s ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(s)) : "Atual";
const shortDate = (s) => s ? s.split("-").reverse().join("/") : "Sem previs\xE3o";
function inPeriod(row, from, to) {
  return (!to || day(row.started_at) <= to) && (!from || !row.ended_at || day(row.ended_at) >= from);
}
function csvCell(v) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export {
  clean,
  csvCell,
  dateLabel,
  day,
  inPeriod,
  shortDate,
  statuses
};
