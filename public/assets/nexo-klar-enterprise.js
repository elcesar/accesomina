(function () {
  "use strict";

  const VERSION = "13.0";
  const ENTERPRISE_KEYS = [
    "uiRolePreferences", "alertWorkflow", "operationTasks", "signatureReminders",
    "communicationTemplates", "communicationHistory", "portalReviews",
    "trainingMatrices", "healthRiskMatrices", "importValidations",
    "inventory", "inventoryMovements", "warehouses", "temporalPreferences",
    "monthlyClosures"
  ];
  const ENTERPRISE_OBJECT_KEYS = new Set(["uiRolePreferences", "alertWorkflow", "temporalPreferences"]);
  let modalSave = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const today = () => new Date().toISOString().slice(0, 10);
  const money = (value) => `$${Math.round(Number(value) || 0).toLocaleString("es-CL")}`;
  const tenantUser = () => typeof currentTenantUser !== "undefined" ? currentTenantUser : null;
  const currentRole = () => String(tenantUser()?.rol || "administrador").toLowerCase();

  function ensureState() {
    if (typeof S === "undefined") return;
    S.uiRolePreferences ||= {};
    S.alertWorkflow ||= {};
    S.operationTasks ||= [];
    S.signatureReminders ||= [];
    S.communicationTemplates ||= [];
    S.communicationHistory ||= [];
    S.portalReviews ||= [];
    S.trainingMatrices ||= [];
    S.healthRiskMatrices ||= [];
    S.importValidations ||= [];
    S.inventory ||= [];
    S.inventoryMovements ||= [];
    S.warehouses ||= [];
    S.temporalPreferences = { mode: "all", from: "", to: "" };
    S.monthlyClosures ||= [];
  }

  function save() {
    ensureState();
    if (typeof persistTenant === "function") persistTenant();
  }

  function installModal() {
    if (document.getElementById("nk128-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-overlay" id="nk128-modal">
        <div class="modal nk128-modal">
          <div class="modal-header">
            <div class="modal-title" id="nk128-modal-title">Nexo Klar</div>
            <button class="modal-close" type="button" onclick="closeModal('nk128-modal')">✕</button>
          </div>
          <div class="modal-body" id="nk128-modal-body"></div>
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" onclick="closeModal('nk128-modal')">Cancelar</button>
            <button class="btn btn-primary" id="nk128-modal-save" type="button">Guardar</button>
          </div>
        </div>
      </div>`);
    document.getElementById("nk128-modal-save").addEventListener("click", () => modalSave?.());
  }

  function openForm(title, body, onSave, saveLabel = "Guardar") {
    installModal();
    document.getElementById("nk128-modal-title").textContent = title;
    document.getElementById("nk128-modal-body").innerHTML = body;
    document.getElementById("nk128-modal-save").textContent = saveLabel;
    modalSave = onSave;
    openModal("nk128-modal");
  }

  function upsertAfterHeader(page, id, html) {
    const pageNode = document.getElementById(`page-${page}`);
    if (!pageNode) return null;
    document.getElementById(id)?.remove();
    const guidance = pageNode.querySelector(".nk-page-guidance");
    const header = pageNode.querySelector(".section-header");
    (guidance || header)?.insertAdjacentHTML("afterend", html);
    return document.getElementById(id);
  }

  function isoDate(date) {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  function monthBounds(value = today().slice(0, 7)) {
    const [year, month] = value.split("-").map(Number);
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const to = isoDate(new Date(year, month, 0));
    return { from, to };
  }

  function temporalRange() {
    ensureState();
    const preference = S.temporalPreferences;
    const current = new Date(`${today()}T12:00:00`);
    if (preference.mode === "all") return { from: "", to: "", label: "Todo el historial" };
    if (preference.mode === "custom") return { from: preference.from || "", to: preference.to || "", label: `${preference.from || "Inicio"} a ${preference.to || "hoy"}` };
    if (preference.mode === "previous_month") {
      current.setMonth(current.getMonth() - 1);
      const bounds = monthBounds(isoDate(current).slice(0, 7));
      return { ...bounds, label: "Mes anterior" };
    }
    if (preference.mode === "last_3" || preference.mode === "last_6" || preference.mode === "last_12") {
      const months = Number(preference.mode.split("_")[1]);
      const fromDate = new Date(current.getFullYear(), current.getMonth() - months + 1, 1);
      return { from: isoDate(fromDate), to: today(), label: `Últimos ${months} meses` };
    }
    if (preference.mode === "current_year") return { from: `${current.getFullYear()}-01-01`, to: `${current.getFullYear()}-12-31`, label: `Año ${current.getFullYear()}` };
    return { ...monthBounds(today().slice(0, 7)), label: "Mes actual" };
  }

  function dateInside(date, range = temporalRange()) {
    const value = String(date || "").slice(0, 10);
    if (!value) return false;
    return (!range.from || value >= range.from) && (!range.to || value <= range.to);
  }

  function overlapsPeriod(start, end, range = temporalRange()) {
    const first = String(start || end || "").slice(0, 10);
    const last = String(end || start || "").slice(0, 10);
    if (!first && !last) return false;
    return (!range.to || first <= range.to) && (!range.from || last >= range.from);
  }

  window.nkPeriodRows128 = function (rows, fields = ["fecha", "createdAt", "updatedAt"]) {
    return (rows || []).filter((row) => fields.some((field) => dateInside(row?.[field])));
  };

  function periodOptions(selected) {
    return [
      ["current_month", "Este mes"], ["previous_month", "Mes anterior"],
      ["last_3", "Últimos 3 meses"], ["last_6", "Últimos 6 meses"],
      ["last_12", "Últimos 12 meses"], ["current_year", "Este año"],
      ["custom", "Rango personalizado"], ["all", "Todo el historial"]
    ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
  }

  function installTemporalToolbar() {
    ensureState();
    document.getElementById("nk128-temporal-toolbar")?.remove();
  }

  window.changeTemporalPeriod128 = function (mode) {
    ensureState();
    S.temporalPreferences.mode = mode;
    if (mode !== "custom") {
      S.temporalPreferences.from = "";
      S.temporalPreferences.to = "";
    }
    save(); installTemporalToolbar();
    if (typeof renderCurrentPageSoft === "function") renderCurrentPageSoft();
    toast("Periodo de análisis actualizado");
  };

  window.changeTemporalCustom128 = function () {
    ensureState();
    const from = document.getElementById("nk128-period-from")?.value || "";
    const to = document.getElementById("nk128-period-to")?.value || "";
    if (from && to && from > to) return toast("La fecha inicial no puede superar la fecha final", "err");
    Object.assign(S.temporalPreferences, { mode: "custom", from, to });
    save();
    if (typeof renderCurrentPageSoft === "function") renderCurrentPageSoft();
  };

  function dashboardMetrics() {
    const alerts = typeof computeAlertas === "function" ? computeAlertas() : [];
    const range = temporalRange();
    const services = (S.mantenciones || []).filter((service) => overlapsPeriod(service.inicio, service.termino, range));
    const ready = services.filter((service) => typeof serviceStatusV107 === "function" && serviceStatusV107(service).status === "Lista para ejecutar").length;
    return {
      personas: (S.trabajadores || []).length,
      clientes: (S.minas || []).length,
      contratos: (S.contratos || []).length,
      ordenes: services.length,
      listos: ready,
      alertas: alerts.length,
      bloqueados: (S.trabajadores || []).filter((worker) => worker.bloqueado || worker.operationalStatus === "bloqueado").length,
      firmas: (S.firmas || []).filter((row) => !["firmado", "cerrado"].includes(row.estado)).length
    };
  }

  const KPI_LABELS = {
    personas: "Personas", clientes: "Clientes", contratos: "Contratos", ordenes: "Órdenes",
    listos: "Listas para ejecutar", alertas: "Alertas", bloqueados: "Personas restringidas", firmas: "Firmas pendientes"
  };
  const SHORTCUTS = {
    mineras: "Clientes", mantenciones: "Órdenes", trabajadores: "Personas", alertas: "Alertas",
    reclutamiento: "Personal temporal", "operaciones-cloud": "Centro Operativo", reportes: "Reportes"
  };

  function renderDashboardPreferences() {
    ensureState();
    const role = currentRole();
    const pref = S.uiRolePreferences[role] || { kpis: ["ordenes", "listos", "alertas", "bloqueados"], shortcuts: ["mineras", "mantenciones", "alertas", "reportes"] };
    const metrics = dashboardMetrics();
    const html = `<div class="card" id="nk128-dashboard-role" style="margin-bottom:16px;">
      <div class="card-header"><div><div class="card-title">Panel configurado para ${esc(role)}</div><div class="card-subtitle">Cada rol puede elegir sus indicadores y accesos rápidos sin afectar a los demás.</div></div><button class="btn btn-secondary btn-sm" onclick="openDashboardConfig128()">Configurar panel</button></div>
      <div class="kpi-grid" style="margin-top:12px;">${pref.kpis.map((key) => `<div class="kpi kpi-blue"><div class="kpi-value">${metrics[key] ?? 0}</div><div class="kpi-label">${esc(KPI_LABELS[key])}</div></div>`).join("")}</div>
      <div class="nk128-actions" style="margin-top:12px;">${pref.shortcuts.map((page) => `<button class="btn btn-secondary btn-sm" onclick="nav('${page}')">${esc(SHORTCUTS[page])}</button>`).join("")}</div>
    </div>`;
    upsertAfterHeader("dashboard", "nk128-dashboard-role", html);
  }

  window.openDashboardConfig128 = function () {
    ensureState();
    const role = currentRole();
    const current = S.uiRolePreferences[role] || { kpis: ["ordenes", "listos", "alertas", "bloqueados"], shortcuts: ["mineras", "mantenciones", "alertas", "reportes"] };
    openForm("Configurar Panel General", `
      <div class="cloud-note">Esta configuración se aplica al rol <b>${esc(role)}</b> dentro de esta empresa.</div>
      <div class="card-title" style="margin-top:14px;">Indicadores</div>
      <div class="form-grid">${Object.entries(KPI_LABELS).map(([key, label]) => `<label><input type="checkbox" data-nk128-kpi value="${key}" ${current.kpis.includes(key) ? "checked" : ""}> ${esc(label)}</label>`).join("")}</div>
      <div class="card-title" style="margin-top:14px;">Accesos rápidos</div>
      <div class="form-grid">${Object.entries(SHORTCUTS).map(([key, label]) => `<label><input type="checkbox" data-nk128-shortcut value="${key}" ${current.shortcuts.includes(key) ? "checked" : ""}> ${esc(label)}</label>`).join("")}</div>`,
    () => {
      const kpis = [...document.querySelectorAll("[data-nk128-kpi]:checked")].map((node) => node.value).slice(0, 6);
      const shortcuts = [...document.querySelectorAll("[data-nk128-shortcut]:checked")].map((node) => node.value).slice(0, 6);
      if (!kpis.length) return toast("Selecciona al menos un indicador", "err");
      S.uiRolePreferences[role] = { kpis, shortcuts };
      save(); closeModal("nk128-modal"); renderDashboardPreferences(); toast("Panel del rol actualizado");
    });
  };

  function periodMetrics(range = temporalRange()) {
    const services = (S.mantenciones || []).filter((row) => overlapsPeriod(row.inicio, row.termino, range));
    const serviceIds = new Set(services.map((row) => row.id));
    const shifts = (S.turnos || []).filter((row) => dateInside(row.fecha, range));
    const epp = (S.eppDeliveries || []).filter((row) => dateInside(row.deliveredAt || row.fecha, range));
    const lodgings = (S.hotelAsig || []).filter((row) => overlapsPeriod(row.checkin, row.checkout, range));
    const incidents = (S.incidentes || []).filter((row) => dateInside(row.fecha || row.createdAt, range));
    const opportunities = (S.opportunities || []).filter((row) => dateInside(row.expectedClose || row.createdAt, range));
    const calls = (S.callouts || []).filter((row) => dateInside(row.fecha, range));
    const signatures = (S.firmas || []).filter((row) => dateInside(row.firmado || row.enviado || row.fecha, range));
    const people = new Set((S.asignaciones || []).filter((row) => serviceIds.has(row.mantId)).map((row) => row.trabId));
    const eppCost = epp.reduce((sum, row) => sum + (Number(row.totalCost || row.cost || row.unitCost || 0) * Number(row.qty || row.quantity || 1)), 0);
    const hotelCost = lodgings.reduce((sum, row) => {
      const hotel = (S.hoteles || []).find((item) => item.id === row.hotelId);
      const start = new Date(`${row.checkin || range.from}T12:00:00`);
      const end = new Date(`${row.checkout || row.checkin || range.to}T12:00:00`);
      const nights = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ? 0 : Math.max(1, Math.ceil((end - start) / 86400000));
      return sum + nights * Number(row.pricePerNight || hotel?.tarifa || 0);
    }, 0);
    return {
      services: services.length,
      people: people.size,
      hours: shifts.reduce((sum, row) => sum + Number(row.hh || 0), 0),
      attendance: shifts.filter((row) => row.asistencia === "presente").length,
      incidents: incidents.length,
      openIncidents: incidents.filter((row) => row.estado !== "cerrado").length,
      eppDeliveries: epp.length,
      eppCost,
      lodgingAssignments: lodgings.length,
      hotelCost,
      calls: calls.length,
      signatures: signatures.length,
      opportunities: opportunities.length,
      projectedRevenue: opportunities.reduce((sum, row) => sum + Number(row.amount || 0) * Number(row.probability || 0) / 100, 0),
      alerts: activeAlerts().filter((row) => dateInside(row.fecha || row.vence || row.workflow?.dueAt, range)).length
    };
  }

  function closureDigest(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `NK-${(hash >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
  }

  function canCloseMonth() {
    return currentRole().includes("admin");
  }

  function renderTemporalAnalysis() {
    const range = temporalRange();
    const metrics = periodMetrics(range);
    const latest = (S.monthlyClosures || [])[0];
    upsertAfterHeader("dashboard", "nk128-temporal-analysis", `<div class="card" id="nk128-temporal-analysis" style="margin-bottom:16px;">
      <div class="card-header"><div><div class="card-title">Análisis del periodo · ${esc(range.label)}</div><div class="card-subtitle">${esc(range.from || "Desde el inicio")} → ${esc(range.to || "hoy")} · información conectada de operación, personas y costos.</div></div><div class="nk128-actions">${canCloseMonth() ? '<button class="btn btn-secondary btn-sm" onclick="openMonthlyClosure128()">Realizar cierre mensual</button>' : ""}<button class="btn btn-ghost btn-sm" onclick="openClosureHistory128()">Historial</button></div></div>
      <div class="kpi-grid" style="margin-top:12px;">
        <div class="kpi kpi-blue"><div class="kpi-value">${metrics.services}</div><div class="kpi-label">Órdenes del periodo</div></div>
        <div class="kpi kpi-green"><div class="kpi-value">${metrics.people}</div><div class="kpi-label">Personas asignadas</div></div>
        <div class="kpi kpi-orange"><div class="kpi-value">${metrics.hours}</div><div class="kpi-label">Horas hombre</div></div>
        <div class="kpi kpi-red"><div class="kpi-value">${metrics.openIncidents}</div><div class="kpi-label">Incidentes abiertos</div></div>
        <div class="kpi kpi-blue"><div class="kpi-value">${money(metrics.eppCost + metrics.hotelCost)}</div><div class="kpi-label">EPP + alojamiento</div></div>
        <div class="kpi kpi-orange"><div class="kpi-value">${money(metrics.projectedRevenue)}</div><div class="kpi-label">Proyección ponderada</div></div>
      </div>
      <div class="nk128-period-detail">
        <span>Entregas EPP: <b>${metrics.eppDeliveries}</b></span><span>Estadías: <b>${metrics.lodgingAssignments}</b></span><span>Convocatorias: <b>${metrics.calls}</b></span><span>Firmas gestionadas: <b>${metrics.signatures}</b></span><span>Alertas del periodo: <b>${metrics.alerts}</b></span>
      </div>${latest ? `<div class="nk128-muted" style="margin-top:10px;">Último cierre: ${esc(latest.period)} · ${esc(latest.createdBy)} · ${esc(latest.createdAt.slice(0, 16).replace("T", " "))}</div>` : ""}
    </div>`);
  }

  window.openMonthlyClosure128 = function () {
    ensureState();
    if (!canCloseMonth()) return toast("Solo administración puede realizar el cierre mensual", "err");
    const defaultPeriod = temporalRange().from?.slice(0, 7) || today().slice(0, 7);
    openForm("Cierre mensual operativo", `<div class="cloud-note">El cierre guarda una fotografía inmutable de los indicadores. No reemplaza los registros originales.</div><div class="form-grid" style="margin-top:14px;">
      <div class="form-group"><label class="form-label">Mes a cerrar</label><input class="form-input" id="nk128-close-period" type="month" min="2025-01" max="2040-12" value="${esc(defaultPeriod)}"></div>
      <div class="form-group"><label class="form-label">Responsable</label><input class="form-input" id="nk128-close-owner" value="${esc(tenantUser()?.nombre || tenantUser()?.email || "")}"></div>
      <div class="form-group full"><label class="form-label">Observaciones del cierre</label><textarea class="form-textarea" id="nk128-close-notes" placeholder="Resultados, desviaciones, compromisos y decisiones del periodo"></textarea></div>
      <div class="form-group full"><label><input type="checkbox" id="nk128-close-confirm"> Confirmo que los datos del periodo fueron revisados</label></div>
    </div>`, () => {
      const period = document.getElementById("nk128-close-period").value;
      const owner = document.getElementById("nk128-close-owner").value.trim();
      if (!period || !owner || !document.getElementById("nk128-close-confirm").checked) return toast("Indica mes, responsable y confirma la revisión", "err");
      if (S.monthlyClosures.some((row) => row.period === period)) return toast("Este mes ya tiene un cierre registrado", "err");
      const bounds = monthBounds(period);
      const metrics = periodMetrics(bounds);
      const closure = {
        id: `mc_${Date.now()}`, period, range: bounds, metrics,
        notes: document.getElementById("nk128-close-notes").value.trim(),
        status: "cerrado", createdAt: new Date().toISOString(),
        createdBy: tenantUser()?.email || owner, responsible: owner,
        version: 1
      };
      closure.integrity = closureDigest({ period: closure.period, range: closure.range, metrics: closure.metrics, createdAt: closure.createdAt, createdBy: closure.createdBy });
      S.monthlyClosures.unshift(closure);
      if (typeof recordHistoryV90 === "function") recordHistoryV90("empresa", S.empresa?.rut || "empresa", "Cierre mensual creado", {}, { period, metrics }, closure.notes || "Cierre operativo");
      save(); closeModal("nk128-modal"); renderTemporalAnalysis(); toast(`Cierre ${period} registrado`);
    }, "Cerrar periodo");
  };

  window.openClosureHistory128 = function () {
    ensureState();
    openForm("Historial de cierres mensuales", `<div class="table-wrap"><table><thead><tr><th>Periodo</th><th>Responsable</th><th>Órdenes</th><th>Personas</th><th>HH</th><th>Incidentes</th><th>Costos</th><th>Fecha cierre</th><th>Integridad</th></tr></thead><tbody>${S.monthlyClosures.map((row) => `<tr><td><b>${esc(row.period)}</b></td><td>${esc(row.responsible)}</td><td>${row.metrics.services}</td><td>${row.metrics.people}</td><td>${row.metrics.hours}</td><td>${row.metrics.incidents}</td><td>${money(row.metrics.eppCost + row.metrics.hotelCost)}</td><td>${esc(row.createdAt.slice(0, 10))}</td><td><span class="badge badge-ok">${esc(row.integrity || "Histórico")}</span></td></tr>`).join("") || '<tr><td colspan="9">Todavía no existen cierres mensuales.</td></tr>'}</tbody></table></div>`, () => closeModal("nk128-modal"), "Cerrar");
  };

  function alertKey(row) {
    return `${row.tipo || "alerta"}|${row.trabId || row.mantId || row.contratoId || ""}|${row.msg || ""}`;
  }

  function activeAlerts() {
    ensureState();
    const now = today();
    return (typeof computeAlertas === "function" ? computeAlertas() : []).map((row) => {
      const workflow = S.alertWorkflow[alertKey(row)] || {};
      return { ...row, workflow, key: alertKey(row) };
    }).filter((row) => row.workflow.status !== "cerrada" && (!row.workflow.snoozedUntil || row.workflow.snoozedUntil <= now));
  }

  function alertAction(row) {
    if (row.trabId) return `Abrir ficha de ${trabNombre(row.trabId)}`;
    if (row.mantId) return `Revisar orden ${mantNombre(row.mantId)}`;
    if (row.contratoId) return `Revisar contrato ${contratoNombre(row.contratoId)}`;
    return "Revisar antecedente y resolver";
  }

  function alertLevel(row) {
    const value = row.urgencia === "falta" ? "critico" : row.urgencia;
    return ["vencido", "critico", "proximo"].includes(value) ? value : "proximo";
  }

  function alertLevelRank(row) {
    return { vencido: 0, critico: 1, proximo: 2 }[alertLevel(row)] ?? 3;
  }

  function alertBadge(row) {
    const level = alertLevel(row);
    const label = row.urgencia === "falta" ? "Faltante" : level === "proximo" ? "Por vencer" : level[0].toUpperCase() + level.slice(1);
    return `<span class="badge ${level === "vencido" ? "badge-err" : level === "critico" ? "badge-crit" : "badge-warn"}">${label}</span>`;
  }

  function filteredActiveAlerts() {
    const txt = (document.getElementById("filt-alerta-txt")?.value || "").toLowerCase();
    const type = document.getElementById("filt-alerta-tipo")?.value || "";
    const urgency = document.getElementById("filt-alerta-urg")?.value || "";
    const client = document.getElementById("filt-alerta-mina")?.value || "";
    const contract = document.getElementById("filt-alerta-contrato")?.value || "";
    const service = document.getElementById("filt-alerta-mant")?.value || "";
    return activeAlerts().filter((row) => {
      if (txt && !String(row.msg || "").toLowerCase().includes(txt) && !String(row.trab?.nombre || "").toLowerCase().includes(txt)) return false;
      if (type && row.tipo !== type) return false;
      if (urgency && row.urgencia !== urgency) return false;
      const person = row.trabId ? (S.trabajadores || []).find((item) => item.id === row.trabId) : null;
      if (client && row.minaId !== client && !(person?.mineras || []).includes(client)) return false;
      if (contract && row.contratoId !== contract && (typeof getMantContratoId === "function" ? getMantContratoId(row.mantId) : "") !== contract && !(typeof workerContratoIds === "function" ? workerContratoIds(person || {}).includes(contract) : false)) return false;
      if (service && row.mantId !== service && !(typeof workerMantIds === "function" ? workerMantIds(person || {}).includes(service) : false)) return false;
      return true;
    });
  }

  function documentAction(row) {
    if (row.trabId && typeof getAlertDocumentTargetV129 === "function" && getAlertDocumentTargetV129(row)) {
      return `<button class="btn btn-primary btn-sm" type="button" onclick="openAlertManagerV129('${esc(row.id)}')">Cargar documento</button>`;
    }
    return `<button class="btn btn-secondary btn-sm" type="button" onclick="manageAlert128('${encodeURIComponent(row.key)}')">Gestionar</button>`;
  }

  function personAlertCard(personId, rows) {
    const person = rows[0]?.trab || (S.trabajadores || []).find((item) => item.id === personId) || {};
    const ordered = rows.slice().sort((a, b) => alertLevelRank(a) - alertLevelRank(b));
    const expired = ordered.filter((row) => alertLevel(row) === "vencido").length;
    const critical = ordered.filter((row) => alertLevel(row) === "critico").length;
    const upcoming = ordered.filter((row) => alertLevel(row) === "proximo").length;
    const firstUploadable = ordered.find((row) => typeof getAlertDocumentTargetV129 === "function" && getAlertDocumentTargetV129(row));
    const serviceNames = typeof workerMantIds === "function" ? workerMantIds(person).map((id) => typeof mantNombre === "function" ? mantNombre(id) : id).filter(Boolean) : [];
    return `<article class="card" style="margin-bottom:12px;border-left:4px solid ${expired ? "var(--red)" : critical ? "var(--orange)" : "var(--blue)"};">
      <div class="card-header" style="align-items:flex-start;gap:12px;"><div><div class="card-title">${esc(person.nombre || "Persona sin identificar")}</div><div class="card-subtitle">${esc(person.rut || "Sin RUT")} · ${esc(person.cargo || person.especialidad || "Sin cargo")}${serviceNames.length ? ` · ${esc(serviceNames.slice(0, 2).join(", "))}` : ""}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">${expired ? `<span class="badge badge-err">${expired} vencido${expired === 1 ? "" : "s"}</span>` : ""}${critical ? `<span class="badge badge-crit">${critical} crítico${critical === 1 ? "" : "s"}</span>` : ""}${upcoming ? `<span class="badge badge-warn">${upcoming} por vencer</span>` : ""}</div></div>
      <div class="cloud-note" style="margin-bottom:10px;"><b>Estado:</b> ${expired || critical ? "No habilitada hasta regularizar los antecedentes críticos." : "Habilitada con antecedentes próximos a vencer."}</div>
      <div style="display:grid;gap:8px;">${ordered.map((row) => `<div class="alert-item alert-${alertLevel(row)}"><div class="alert-dot dot-${alertLevel(row)}"></div><div style="flex:1;"><b>${esc(String(row.msg || "").replace(`${person.nombre || ""}: `, ""))}</b><div class="nk128-muted">${esc(row.tipo || "antecedente")} · ${esc(row.workflow.owner || "Sin responsable asignado")}</div></div>${alertBadge(row)}${documentAction(row)}</div>`).join("")}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px;"><button class="btn btn-ghost btn-sm" type="button" onclick="openFicha('${esc(personId)}')">Abrir ficha</button>${firstUploadable ? `<button class="btn btn-primary btn-sm" type="button" onclick="openAlertManagerV129('${esc(firstUploadable.id)}')">Regularizar documento</button>` : ""}<button class="btn btn-secondary btn-sm" type="button" onclick="notifWA('${esc(personId)}','${esc(`Nexo Klar: tienes ${ordered.length} antecedente(s) pendiente(s) de regularización.`)}')">Notificar</button></div>
    </article>`;
  }

  function renderManagedAlerts() {
    ensureState();
    const listHost = document.getElementById("alertas-list");
    if (!listHost) return;
    const rows = filteredActiveAlerts();
    const byPerson = new Map();
    const operational = [];
    rows.forEach((row) => row.trabId ? byPerson.set(row.trabId, [...(byPerson.get(row.trabId) || []), row]) : operational.push(row));
    const people = [...byPerson.entries()].sort((a, b) => alertLevelRank(a[1][0]) - alertLevelRank(b[1][0]) || b[1].length - a[1].length);
    const expired = rows.filter((row) => alertLevel(row) === "vencido").length;
    const critical = rows.filter((row) => alertLevel(row) === "critico").length;
    const upcoming = rows.filter((row) => alertLevel(row) === "proximo").length;
    const summary = `<div class="kpi-grid" style="margin-bottom:16px;"><div class="kpi kpi-red"><div class="kpi-value">${people.filter(([, group]) => group.some((row) => ["vencido", "critico"].includes(alertLevel(row)))).length}</div><div class="kpi-label">Personas no habilitadas</div></div><div class="kpi kpi-red"><div class="kpi-value">${expired}</div><div class="kpi-label">Documentos vencidos</div></div><div class="kpi kpi-orange"><div class="kpi-value">${upcoming}</div><div class="kpi-label">Próximos a vencer</div></div><div class="kpi kpi-blue"><div class="kpi-value">${operational.length}</div><div class="kpi-label">Alertas de recursos y operación</div></div></div>`;
    const peopleContent = people.length ? `<div class="card" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Personas con antecedentes por gestionar</div><div class="card-subtitle">Cada persona aparece una sola vez con todos sus documentos, cursos, exámenes y firmas pendientes.</div></div><span class="badge badge-blue">${people.length} persona(s)</span></div></div>${people.map(([personId, group]) => personAlertCard(personId, group)).join("")}` : "";
    const operationContent = operational.length ? `<div class="card"><div class="card-header"><div><div class="card-title">Recursos, contratos y operación</div><div class="card-subtitle">Alertas no asociadas a una persona: contratos, vehículos, terceros, órdenes y documentación de empresa.</div></div><span class="badge badge-warn">${operational.length}</span></div>${operational.sort((a, b) => alertLevelRank(a) - alertLevelRank(b)).map((row) => `<div class="alert-item alert-${alertLevel(row)}"><div class="alert-dot dot-${alertLevel(row)}"></div><div style="flex:1;"><b>${esc(row.msg)}</b><div class="nk128-muted">${esc(row.tipo || "operación")} · ${esc(row.workflow.owner || alertAction(row))}</div></div>${alertBadge(row)}${documentAction(row)}</div>`).join("")}</div>` : "";
    listHost.innerHTML = rows.length ? `${summary}${peopleContent}${operationContent}` : '<div class="empty">No existen alertas activas para estos filtros.</div>';
    const closed = Object.values(S.alertWorkflow).filter((row) => row.status === "cerrada").length;
    const snoozed = Object.values(S.alertWorkflow).filter((row) => row.snoozedUntil && row.snoozedUntil > today()).length;
    document.getElementById("alertas-sub").textContent = `${rows.length} alertas activas · ${people.length} personas agrupadas · ${critical} críticas · ${closed} cerradas · ${snoozed} pospuestas`;
  }

  window.manageAlert128 = function (encodedKey) {
    ensureState();
    const key = decodeURIComponent(encodedKey);
    const record = S.alertWorkflow[key] || {};
    openForm("Gestionar alerta", `
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Responsable</label><input class="form-input" id="nk128-alert-owner" value="${esc(record.owner || tenantUser()?.nombre || tenantUser()?.email || "")}"></div>
        <div class="form-group"><label class="form-label">Estado</label><select class="form-select" id="nk128-alert-status"><option value="pendiente">Pendiente</option><option value="en_gestion" ${record.status === "en_gestion" ? "selected" : ""}>En gestión</option><option value="cerrada">Cerrada</option></select></div>
        <div class="form-group"><label class="form-label">Posponer hasta</label><input class="form-input" id="nk128-alert-snooze" type="date" value="${esc(record.snoozedUntil || "")}"></div>
        <div class="form-group"><label class="form-label">Fecha compromiso</label><input class="form-input" id="nk128-alert-due" type="date" value="${esc(record.dueAt || "")}"></div>
        <div class="form-group full"><label class="form-label">Acción / comentario</label><textarea class="form-textarea" id="nk128-alert-note">${esc(record.note || "")}</textarea></div>
      </div>`,
    () => {
      S.alertWorkflow[key] = {
        owner: document.getElementById("nk128-alert-owner").value.trim(),
        status: document.getElementById("nk128-alert-status").value,
        snoozedUntil: document.getElementById("nk128-alert-snooze").value,
        dueAt: document.getElementById("nk128-alert-due").value,
        note: document.getElementById("nk128-alert-note").value.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: tenantUser()?.email || "usuario"
      };
      save(); closeModal("nk128-modal"); renderManagedAlerts(); if (typeof updateBadges === "function") updateBadges(); toast("Alerta actualizada");
    });
  };

  function startOfWeek() {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function renderOperationsPlanning() {
    ensureState();
    const start = startOfWeek();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      const services = (S.mantenciones || []).filter((row) => row.inicio <= iso && row.termino >= iso);
      return `<div class="nk128-day ${iso === today() ? "today" : ""}"><b>${date.toLocaleDateString("es-CL", { weekday: "short", day: "2-digit" })}</b>${services.map((service) => `<div class="nk128-item"><b>${esc(service.nombre)}</b><div class="nk128-muted">${esc(minaNombre(service.minaId))}</div></div>`).join("") || '<div class="nk128-muted" style="margin-top:10px;">Sin órdenes</div>'}</div>`;
    }).join("");
    const workflowTasks = Object.entries(S.alertWorkflow).filter(([, row]) => row.status !== "cerrada" && row.owner).map(([key, row]) => ({ id: key, title: row.note || "Resolver alerta", owner: row.owner, due: row.dueAt, source: "Alerta" }));
    const serviceTasks = (S.mantenciones || []).filter((row) => row.gapOwner || row.nextMilestone).map((row) => ({ id: row.id, title: row.nextMilestone || "Resolver brechas", owner: row.gapOwner || "Sin responsable", due: row.nextMilestoneDate || row.termino, source: row.nombre }));
    const tasks = [...workflowTasks, ...serviceTasks].sort((a, b) => String(a.due || "").localeCompare(String(b.due || ""))).slice(0, 12);
    upsertAfterHeader("operaciones-cloud", "nk128-operations-planning", `<div id="nk128-operations-planning">
      <div class="card" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Calendario semanal de ejecución</div><div class="card-subtitle">Órdenes activas según su fecha de inicio y término.</div></div></div><div class="nk128-week">${days}</div></div>
      <div class="card" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Bandeja de tareas por responsable</div><div class="card-subtitle">Compromisos provenientes de alertas y brechas operativas.</div></div></div><div class="table-wrap"><table><thead><tr><th>Tarea</th><th>Origen</th><th>Responsable</th><th>Compromiso</th></tr></thead><tbody>${tasks.map((task) => `<tr><td><b>${esc(task.title)}</b></td><td>${esc(task.source)}</td><td>${esc(task.owner)}</td><td>${esc(task.due || "Sin fecha")}</td></tr>`).join("") || '<tr><td colspan="4">Sin tareas asignadas.</td></tr>'}</tbody></table></div></div>
    </div>`);
  }

  function renderOpportunityProjection() {
    const range = temporalRange();
    const active = (S.opportunities || []).filter((row) => !["ganada", "perdida"].includes(row.stage) && (range.from || range.to ? dateInside(row.expectedClose || row.createdAt, range) : true));
    const months = {};
    active.forEach((row) => {
      const month = String(row.expectedClose || "Sin fecha").slice(0, 7) || "Sin fecha";
      months[month] ||= { count: 0, gross: 0, weighted: 0, missing: 0 };
      months[month].count += 1;
      months[month].gross += Number(row.amount) || 0;
      months[month].weighted += (Number(row.amount) || 0) * (Number(row.probability) || 0) / 100;
      if (!row.nextAction) months[month].missing += 1;
    });
    upsertAfterHeader("oportunidades", "nk128-opportunity-projection", `<div class="card" id="nk128-opportunity-projection" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Proyección mensual del embudo</div><div class="card-subtitle">La probabilidad, fecha estimada y próxima acción permiten anticipar cierres y gestiones.</div></div></div><div class="table-wrap"><table><thead><tr><th>Mes estimado</th><th>Oportunidades</th><th>Pipeline</th><th>Ponderado</th><th>Sin próxima acción</th></tr></thead><tbody>${Object.entries(months).sort().map(([month, row]) => `<tr><td><b>${esc(month)}</b></td><td>${row.count}</td><td>${money(row.gross)}</td><td>${money(row.weighted)}</td><td><span class="badge ${row.missing ? "badge-warn" : "badge-ok"}">${row.missing}</span></td></tr>`).join("") || '<tr><td colspan="5">Sin oportunidades activas.</td></tr>'}</tbody></table></div></div>`);
  }

  function renderContractReminders() {
    ensureState();
    const rows = (S.firmas || []).filter((row) => !["firmado", "cerrado"].includes(row.estado));
    const providerReady = Boolean(window.AccesoMinaCloud?.enabled);
    upsertAfterHeader("contratos", "nk128-contract-reminders", `<div class="card" id="nk128-contract-reminders" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Recordatorios y confirmación de firma</div><div class="card-subtitle">Seguimiento de documentos pendientes y estado del conector de firma.</div></div><span class="badge ${providerReady ? "badge-ok" : "badge-warn"}">${providerReady ? "API productiva disponible" : "Proveedor pendiente de configuración"}</span></div><div class="table-wrap"><table><thead><tr><th>Documento</th><th>Persona</th><th>Orden</th><th>Estado</th><th>Último recordatorio</th><th></th></tr></thead><tbody>${rows.map((row) => { const last = S.signatureReminders.find((item) => item.signatureId === row.id); return `<tr><td><b>${esc(row.tipo)}</b></td><td>${esc(trabNombre(row.trabId))}</td><td>${esc(mantNombre(row.mantId))}</td><td><span class="badge badge-warn">${esc(row.estado)}</span></td><td>${esc(last?.sentAt?.slice(0, 16).replace("T", " ") || "Sin envío")}</td><td><button class="btn btn-secondary btn-sm" onclick="sendSignatureReminder128('${row.id}')">Registrar recordatorio</button></td></tr>`; }).join("") || '<tr><td colspan="6">No existen firmas pendientes.</td></tr>'}</tbody></table></div></div>`);
  }

  window.sendSignatureReminder128 = function (id) {
    ensureState();
    S.signatureReminders.unshift({ id: `sr_${Date.now()}`, signatureId: id, sentAt: new Date().toISOString(), sentBy: tenantUser()?.email || "usuario", providerConfirmed: Boolean(window.AccesoMinaCloud?.enabled) });
    save(); renderContractReminders(); toast("Recordatorio registrado en historial");
  };

  function injectServiceManagement(id) {
    const service = S.mantenciones.find((row) => row.id === id);
    const target = document.getElementById("mant-tab-timeline");
    if (!service || !target || document.getElementById("nk128-service-management")) return;
    target.insertAdjacentHTML("afterbegin", `<div class="card" id="nk128-service-management" style="margin-bottom:14px;"><div class="card-header"><div><div class="card-title">Plan, avance e hitos</div><div class="card-subtitle">Presupuesto, progreso y responsable de resolver las brechas de la orden.</div></div><button class="btn btn-primary btn-sm" onclick="saveServiceManagement128('${id}')">Guardar</button></div><div class="form-grid">
      <div class="form-group"><label class="form-label">Presupuesto (CLP)</label><input class="form-input" id="nk128-service-budget" type="number" min="0" value="${Number(service.budget || 0)}"></div>
      <div class="form-group"><label class="form-label">Avance (%)</label><input class="form-input" id="nk128-service-progress" type="number" min="0" max="100" value="${Number(service.progress || 0)}"></div>
      <div class="form-group"><label class="form-label">Responsable de brechas</label><input class="form-input" id="nk128-service-owner" value="${esc(service.gapOwner || service.admin || "")}"></div>
      <div class="form-group"><label class="form-label">Próximo hito</label><input class="form-input" id="nk128-service-milestone" value="${esc(service.nextMilestone || "")}"></div>
      <div class="form-group"><label class="form-label">Fecha próximo hito</label><input class="form-input" id="nk128-service-milestone-date" type="date" value="${esc(service.nextMilestoneDate || "")}"></div>
      <div class="form-group full"><label class="form-label">Hitos y observaciones</label><textarea class="form-textarea" id="nk128-service-notes">${esc(service.milestones || "")}</textarea></div>
    </div></div>`);
  }

  window.saveServiceManagement128 = function (id) {
    const service = S.mantenciones.find((row) => row.id === id);
    if (!service) return;
    service.budget = Math.max(0, Number(document.getElementById("nk128-service-budget").value) || 0);
    service.progress = Math.min(100, Math.max(0, Number(document.getElementById("nk128-service-progress").value) || 0));
    service.gapOwner = document.getElementById("nk128-service-owner").value.trim();
    service.nextMilestone = document.getElementById("nk128-service-milestone").value.trim();
    service.nextMilestoneDate = document.getElementById("nk128-service-milestone-date").value;
    service.milestones = document.getElementById("nk128-service-notes").value.trim();
    service.evolution ||= [];
    service.evolution.unshift({ id: `ev_${Date.now()}`, date: today(), type: "avance", detail: `Avance ${service.progress}% · presupuesto ${money(service.budget)} · ${service.nextMilestone || "sin hito"}`, owner: tenantUser()?.email || "usuario" });
    save(); toast("Plan de la orden actualizado");
  };

  function subcontractScore(row) {
    const fields = ["f30", "f301", "cotizaciones", "seguro"];
    const valid = fields.filter((key) => row[key] && typeof estadoFecha === "function" && estadoFecha(row[key]) === "vigente").length;
    const missing = fields.filter((key) => !row[key] || estadoFecha(row[key]) === "vencido");
    return { score: Math.round(valid / fields.length * 100), missing, blocked: missing.length > 0 };
  }

  function renderSubcontractCompliance() {
    ensureState();
    (S.subcontratos || []).forEach((row) => { row.operationalBlock = subcontractScore(row).blocked; });
    const rows = (S.subcontratos || []).map((row) => ({ row, status: subcontractScore(row) }));
    upsertAfterHeader("subcontratos", "nk128-subcontract-compliance", `<div class="card" id="nk128-subcontract-compliance" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Cumplimiento y restricción automática</div><div class="card-subtitle">Un tercero queda restringido operacionalmente cuando falta o vence documentación crítica.</div></div></div><div class="table-wrap"><table><thead><tr><th>Tercero</th><th>Cumplimiento</th><th>Faltantes críticos</th><th>Estado operativo</th></tr></thead><tbody>${rows.map(({ row, status }) => `<tr><td><b>${esc(row.razon)}</b><div class="worker-rut">${esc(row.rut)}</div></td><td><b>${status.score}%</b></td><td>${status.missing.map((key) => `<span class="badge badge-err">${esc(key.toUpperCase())}</span>`).join(" ") || '<span class="badge badge-ok">Sin brechas</span>'}</td><td><span class="badge ${status.blocked ? "badge-err" : "badge-ok"}">${status.blocked ? "Restringido" : "Habilitado"}</span></td></tr>`).join("") || '<tr><td colspan="4">Sin terceros registrados.</td></tr>'}</tbody></table></div></div>`);
  }

  function renderEppInventoryBridge() {
    const stock = (S.inventoryItems || []).filter((row) => String(row.category || row.type || "").toLowerCase().includes("epp"));
    const pending = (S.trabajadores || []).filter((worker) => typeof eppStatus === "function" && (eppStatus(worker).missing.length || eppStatus(worker).expired.length));
    upsertAfterHeader("epp", "nk128-epp-inventory", `<div class="card" id="nk128-epp-inventory" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Existencias de EPP</div><div class="card-subtitle">El stock se administra desde Activos, Equipos e Inventario. Aquí solo se revisan entregas y necesidades de las personas.</div></div><button class="btn btn-secondary btn-sm" onclick="openAssetsWorkspaceV146('epp')">Abrir inventario EPP</button></div><div class="kpi-grid" style="margin-top:12px;"><div class="kpi kpi-blue"><div class="kpi-value">${stock.reduce((sum, row) => sum + Number(row.stock || 0), 0)}</div><div class="kpi-label">Unidades EPP en stock</div></div><div class="kpi kpi-orange"><div class="kpi-value">${pending.length}</div><div class="kpi-label">Personas por abastecer</div></div><div class="kpi kpi-red"><div class="kpi-value">${stock.filter((row) => Number(row.stock || 0) <= Number(row.minStock || 0)).length}</div><div class="kpi-label">Reposiciones necesarias</div></div></div></div>`);
  }

  function renderTrainingMatrix() {
    const roles = [...new Set((S.trabajadores || []).map((row) => row.cargo || row.especialidad).filter(Boolean))].sort();
    upsertAfterHeader("cursos", "nk128-training-matrix", `<div class="card" id="nk128-training-matrix" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Matriz de formación obligatoria</div><div class="card-subtitle">Define cursos mínimos por cargo y orden de servicio.</div></div><button class="btn btn-primary btn-sm" onclick="openTrainingMatrix128()">+ Regla de formación</button></div><div class="table-wrap"><table><thead><tr><th>Cargo / especialidad</th><th>Orden</th><th>Curso requerido</th><th>Vigencia</th></tr></thead><tbody>${S.trainingMatrices.map((row) => `<tr><td><b>${esc(row.role)}</b></td><td>${esc(mantNombre(row.serviceId) || "Todas")}</td><td>${esc(row.course)}</td><td>${row.validityMonths} meses</td></tr>`).join("") || '<tr><td colspan="4">Sin reglas configuradas.</td></tr>'}</tbody></table></div><div class="nk128-muted">Cargos disponibles: ${roles.map(esc).join(", ") || "sin catálogo"}</div></div>`);
  }

  window.openTrainingMatrix128 = function () {
    const roles = [...new Set((S.trabajadores || []).map((row) => row.cargo || row.especialidad).filter(Boolean))].sort();
    openForm("Nueva regla de formación", `<div class="form-grid"><div class="form-group"><label class="form-label">Cargo / especialidad</label><select class="form-select" id="nk128-training-role">${roles.map((role) => `<option>${esc(role)}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">Orden de servicio</label><select class="form-select" id="nk128-training-service"><option value="">Todas</option>${(S.mantenciones || []).map((row) => `<option value="${row.id}">${esc(row.nombre)}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">Curso requerido</label><input class="form-input" id="nk128-training-course" required></div><div class="form-group"><label class="form-label">Vigencia (meses)</label><input class="form-input" id="nk128-training-validity" type="number" min="1" value="12"></div></div>`, () => {
      const course = document.getElementById("nk128-training-course").value.trim();
      if (!course) return toast("Indica el curso requerido", "err");
      S.trainingMatrices.push({ id: `tm_${Date.now()}`, role: document.getElementById("nk128-training-role").value, serviceId: document.getElementById("nk128-training-service").value, course, validityMonths: Number(document.getElementById("nk128-training-validity").value) || 12 });
      save(); closeModal("nk128-modal"); renderTrainingMatrix(); toast("Regla de formación creada");
    });
  };

  function renderHealthMatrix() {
    const canView = ["admin", "prevencion", "salud"].some((role) => currentRole().includes(role));
    upsertAfterHeader("protocolos", "nk128-health-matrix", `<div class="card" id="nk128-health-matrix" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Matriz cargo–riesgo–protocolo</div><div class="card-subtitle">Los datos clínicos permanecen restringidos; la operación consulta solo aptitud y vigencia.</div></div>${canView ? '<button class="btn btn-primary btn-sm" onclick="openHealthMatrix128()">+ Regla de salud</button>' : '<span class="badge badge-warn">Vista restringida</span>'}</div>${canView ? `<div class="table-wrap"><table><thead><tr><th>Cargo</th><th>Riesgo / exposición</th><th>Protocolo</th><th>Periodicidad</th></tr></thead><tbody>${S.healthRiskMatrices.map((row) => `<tr><td><b>${esc(row.role)}</b></td><td>${esc(row.risk)}</td><td>${esc(row.protocol)}</td><td>${row.frequencyMonths} meses</td></tr>`).join("") || '<tr><td colspan="4">Sin reglas configuradas.</td></tr>'}</tbody></table></div>` : '<div class="cloud-note">Solicite acceso a un administrador o responsable de salud ocupacional.</div>'}</div>`);
  }

  window.openHealthMatrix128 = function () {
    const roles = [...new Set((S.trabajadores || []).map((row) => row.cargo || row.especialidad).filter(Boolean))].sort();
    openForm("Nueva regla de salud ocupacional", `<div class="form-grid"><div class="form-group"><label class="form-label">Cargo</label><select class="form-select" id="nk128-health-role">${roles.map((role) => `<option>${esc(role)}</option>`).join("")}</select></div><div class="form-group"><label class="form-label">Riesgo / exposición</label><input class="form-input" id="nk128-health-risk"></div><div class="form-group"><label class="form-label">Protocolo requerido</label><input class="form-input" id="nk128-health-protocol"></div><div class="form-group"><label class="form-label">Periodicidad (meses)</label><input class="form-input" id="nk128-health-frequency" type="number" min="1" value="12"></div></div>`, () => {
      const risk = document.getElementById("nk128-health-risk").value.trim(), protocol = document.getElementById("nk128-health-protocol").value.trim();
      if (!risk || !protocol) return toast("Completa riesgo y protocolo", "err");
      S.healthRiskMatrices.push({ id: `hm_${Date.now()}`, role: document.getElementById("nk128-health-role").value, risk, protocol, frequencyMonths: Number(document.getElementById("nk128-health-frequency").value) || 12 });
      save(); closeModal("nk128-modal"); renderHealthMatrix(); toast("Regla de salud creada");
    });
  };

  function normalized129(value) {
    return String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function workerMatchesRole129(worker, role) {
    const candidate = normalized129(`${worker?.cargo || ""} ${worker?.especialidad || ""} ${worker?.rol || ""}`);
    const expected = normalized129(role);
    return !expected || candidate.includes(expected) || expected.includes(candidate);
  }

  function expiredOrMissing129(date) {
    const state = typeof estadoFecha === "function" ? estadoFecha(date) : "vigente";
    return !date || ["vencido", "falta", "critico"].includes(state);
  }

  function readinessForWorker129(worker) {
    const active = (S.asignaciones || []).find((row) => row.trabId === worker.id && !["baja", "cerrado", "cancelado"].includes(row.estado));
    const trainingRules = (S.trainingMatrices || []).filter((row) => workerMatchesRole129(worker, row.role) && (!row.serviceId || row.serviceId === active?.mantId));
    const courseRows = typeof buildCursoRows === "function" ? buildCursoRows().filter((row) => row.trabId === worker.id) : [];
    const trainingMissing = trainingRules.filter((rule) => !courseRows.some((row) => normalized129(row.label).includes(normalized129(rule.course)) && !expiredOrMissing129(row.vence))).map((rule) => rule.course);
    const healthRules = (S.healthRiskMatrices || []).filter((row) => workerMatchesRole129(worker, row.role));
    const protocols = (S.protocolosSalud || []).filter((row) => row.trabId === worker.id);
    const healthMissing = healthRules.filter((rule) => !protocols.some((row) => {
      const detail = normalized129(`${row.tipo || ""} ${row.examen || ""} ${row.curso || ""}`);
      return detail.includes(normalized129(rule.protocol)) && !expiredOrMissing129(row.vence);
    })).map((rule) => rule.protocol);
    const shift = (S.turnos || []).find((row) => row.trabId === worker.id && row.fecha === today());
    const operational = typeof computeOperationalStatusV90 === "function" ? computeOperationalStatusV90(worker) : { blocked: Boolean(worker.bloqueado), reasons: [] };
    const reasons = [...new Set([...(operational.reasons || []), ...trainingMissing.map((item) => `Formación: ${item}`), ...healthMissing.map((item) => `Aptitud: ${item}`)])];
    return {
      worker, active, shift, trainingMissing, healthMissing, reasons,
      ready: !worker.bloqueado && !operational.blocked && !trainingMissing.length && !healthMissing.length
    };
  }

  function readinessBadge129(ok, positive, pending) {
    return `<span class="badge ${ok ? "badge-ok" : "badge-warn"}">${esc(ok ? positive : pending)}</span>`;
  }

  function readinessRows129() {
    return (S.trabajadores || []).filter((worker) => !worker.bloqueado).map(readinessForWorker129);
  }

  function renderReadiness129(page) {
    const rows = readinessRows129();
    const ready = rows.filter((row) => row.ready).length;
    const training = rows.filter((row) => row.trainingMissing.length).length;
    const health = rows.filter((row) => row.healthMissing.length).length;
    const attendance = rows.filter((row) => row.shift?.asistencia === "presente").length;
    const focus = page === "turnos"
      ? { title: "Disponibilidad y asistencia de hoy", subtitle: "Cruza el turno registrado con la habilitación de cada persona antes de ejecutar.", metric: [attendance, "Presentes hoy"] }
      : page === "cursos"
        ? { title: "Formación que habilita el trabajo", subtitle: "Las reglas por cargo y orden muestran qué certificaciones deben renovarse.", metric: [training, "Con formación pendiente"] }
        : { title: "Aptitud operativa y vigilancia", subtitle: "La operación consulta aptitud y vigencia; los antecedentes clínicos permanecen restringidos.", metric: [health, "Con aptitud pendiente"] };
    upsertAfterHeader(page, `nk129-readiness-${page}`, `<div class="card" id="nk129-readiness-${page}" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">${focus.title}</div><div class="card-subtitle">${focus.subtitle}</div></div><button class="btn btn-secondary btn-sm" onclick="openReadinessReview129()">Revisar personas</button></div><div class="kpi-grid" style="margin-top:12px;"><div class="kpi kpi-green"><div class="kpi-value">${ready}</div><div class="kpi-label">Listas para asignar</div></div><div class="kpi kpi-orange"><div class="kpi-value">${focus.metric[0]}</div><div class="kpi-label">${focus.metric[1]}</div></div><div class="kpi kpi-blue"><div class="kpi-value">${rows.filter((row) => row.shift).length}</div><div class="kpi-label">Turnos registrados hoy</div></div><div class="kpi kpi-red"><div class="kpi-value">${rows.filter((row) => !row.ready).length}</div><div class="kpi-label">Pendientes de habilitación</div></div></div><div class="cloud-note" style="margin-top:12px;">La habilitación considera documentación, contrato, formación y aptitud configurada. Los requisitos críticos continúan controlándose desde la matriz de requisitos de la empresa.</div></div>`);
  }

  window.openReadinessReview129 = function () {
    const rows = readinessRows129().filter((row) => !row.ready || row.shift?.asistencia === "ausente");
    openForm("Personas pendientes de habilitación", `<div class="cloud-note">Revise la causa y abra la ficha para regularizar formación, aptitud, documentos o asignación. No se muestran antecedentes médicos.</div><div class="table-wrap" style="margin-top:12px;"><table><thead><tr><th>Persona</th><th>Formación</th><th>Aptitud</th><th>Turno hoy</th><th>Qué falta</th><th></th></tr></thead><tbody>${rows.map((row) => `<tr><td><b>${esc(row.worker.nombre)}</b><div class="worker-rut">${esc(row.worker.cargo || row.worker.especialidad || "Sin cargo")}</div></td><td>${readinessBadge129(!row.trainingMissing.length, "Al día", "Pendiente")}</td><td>${readinessBadge129(!row.healthMissing.length, "Apta", "Revisar")}</td><td>${esc(row.shift?.asistencia || "Sin registro")}</td><td>${esc(row.reasons.slice(0, 3).join(" · ") || "Regularizar asistencia")}</td><td><button class="btn btn-secondary btn-sm" onclick="closeModal('nk128-modal');openFicha('${row.worker.id}')">Ficha</button></td></tr>`).join("") || '<tr><td colspan="6">No hay personas pendientes en esta vista.</td></tr>'}</tbody></table></div>`, () => closeModal("nk128-modal"), "Cerrar");
  };

  function renderCommunicationsGovernance() {
    const calls = S.callouts || [];
    const open = calls.filter((row) => !["cerrada", "cancelada"].includes(row.communicationStatus || "enviada"));
    const recipients = open.flatMap((row) => row.recipients || []);
    const confirmed = recipients.filter((row) => row.status === "confirmada").length;
    const pending = recipients.filter((row) => ["pendiente", "enviada", "sin_respuesta"].includes(row.status || "pendiente")).length;
    const overdue = open.filter((row) => row.responseDeadline && row.responseDeadline < new Date().toISOString().slice(0, 16)).length;
    upsertAfterHeader("llamados", "nk128-communications", `<div class="card" id="nk128-communications" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Convocatorias con seguimiento</div><div class="card-subtitle">Convoca, registra respuestas y asigna solo a personas confirmadas y habilitadas.</div></div><button class="btn btn-primary btn-sm" onclick="openCommunicationTemplate128()">+ Plantilla aprobada</button></div><div class="kpi-grid" style="margin-top:12px;"><div class="kpi kpi-blue"><div class="kpi-value">${open.length}</div><div class="kpi-label">Convocatorias abiertas</div></div><div class="kpi kpi-orange"><div class="kpi-value">${pending}</div><div class="kpi-label">Sin respuesta</div></div><div class="kpi kpi-green"><div class="kpi-value">${confirmed}</div><div class="kpi-label">Confirmaciones</div></div><div class="kpi kpi-red"><div class="kpi-value">${overdue}</div><div class="kpi-label">Plazos vencidos</div></div></div><div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Convocatoria</th><th>Orden</th><th>Canal</th><th>Plazo</th><th>Respuestas</th><th></th></tr></thead><tbody>${open.slice(0, 8).map((row) => { const list = row.recipients || []; const yes = list.filter((person) => person.status === "confirmada").length; const no = list.filter((person) => person.status === "rechazada").length; return `<tr><td><b>${esc(row.title || "Convocatoria")}</b><div class="worker-rut">${esc((row.especialidades || []).join(" · ") || "Sin especialidad")}</div></td><td>${esc(typeof mantNombre === "function" ? mantNombre(row.mantId) : row.mantId)}</td><td>${esc(row.channel || "WhatsApp")}</td><td>${esc(row.responseDeadline || "Sin plazo")}</td><td><span class="badge badge-ok">${yes} confirma</span> <span class="badge badge-na">${no} rechaza</span></td><td><button class="btn btn-secondary btn-sm" onclick="openCalloutFollowUp128('${esc(row.id)}')">Gestionar</button></td></tr>`; }).join("") || '<tr><td colspan="6">Aún no hay convocatorias para gestionar.</td></tr>'}</tbody></table></div><div class="divider"></div><div class="grid-2"><div class="table-wrap"><table><thead><tr><th>Plantilla</th><th>Canal</th><th>Estado</th></tr></thead><tbody>${S.communicationTemplates.map((row) => `<tr><td><b>${esc(row.name)}</b><div class="worker-rut">${esc(row.body)}</div></td><td>${esc(row.channel)}</td><td><span class="badge ${row.approved ? "badge-ok" : "badge-warn"}">${row.approved ? "Aprobada" : "Borrador"}</span></td></tr>`).join("") || '<tr><td colspan="3">Sin plantillas.</td></tr>'}</tbody></table></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Destinatarios</th><th>Canal</th><th>Resultado</th></tr></thead><tbody>${S.communicationHistory.slice(0, 10).map((row) => `<tr><td>${esc(row.sentAt?.slice(0, 16).replace("T", " "))}</td><td>${row.recipients}</td><td>${esc(row.channel)}</td><td>${esc(row.status)}</td></tr>`).join("") || '<tr><td colspan="4">Sin entregas registradas.</td></tr>'}</tbody></table></div></div><div class="cloud-note">Antes de enviar, valide consentimiento y datos de contacto. Los envíos reales requieren el proveedor de correo o WhatsApp configurado.</div></div>`);
  }

  function communicationOptions128() {
    return {
      channel: document.getElementById("co-channel-128")?.value || "WhatsApp",
      priority: document.getElementById("co-priority-128")?.value || "Normal",
      responseDeadline: document.getElementById("co-deadline-128")?.value || "",
      responsible: document.getElementById("co-owner-128")?.value.trim() || tenantUser()?.nombre || S.empresa?.representante || "Administración",
      templateName: document.getElementById("co-template")?.selectedOptions?.[0]?.textContent?.trim() || "Plantilla de convocatoria"
    };
  }

  function eligibleRecipients128(callout) {
    const specialties = new Set(callout.especialidades || []);
    return (S.trabajadores || []).filter((worker) => {
      const hasChannel = callout.channel === "Correo" ? Boolean(worker.email) : callout.channel === "WhatsApp y correo" ? Boolean(worker.tel || worker.email) : Boolean(worker.tel);
      const enabled = !worker.bloqueado && worker.operationalStatus !== "restringido" && worker.operationalStatus !== "bloqueado";
      return enabled && worker.disponibilidad === "disponible" && specialties.has(worker.especialidad) && hasChannel && worker.communicationConsent !== false;
    });
  }

  function enrichCallout128(callout, people) {
    if (!callout) return;
    const options = communicationOptions128();
    Object.assign(callout, options, {
      title: callout.title || `${options.priority} · ${typeof mantNombre === "function" ? mantNombre(callout.mantId) : "Convocatoria"}`,
      communicationStatus: "enviada",
      recipients: (people || eligibleRecipients128({ ...callout, ...options })).map((worker) => ({ workerId: worker.id, status: "enviada", sentAt: new Date().toISOString(), respondedAt: "", note: "" })),
      createdAt: callout.createdAt || new Date().toISOString()
    });
    S.communicationHistory.unshift({ id: `ch_${Date.now()}`, type: "convocatoria", calloutId: callout.id, sentAt: new Date().toISOString(), recipients: callout.recipients.length, channel: options.channel, status: "enviada", serviceId: callout.mantId, responsible: options.responsible });
    save();
  }

  function installCalloutForm128() {
    const modal = document.getElementById("modal-callout");
    if (!modal || document.getElementById("co-channel-128")) return;
    modal.querySelector(".modal-title").textContent = "Nueva convocatoria";
    const cupos = document.getElementById("co-cupos")?.closest(".form-group");
    if (!cupos) return;
    cupos.insertAdjacentHTML("afterend", `<div class="form-group"><label class="form-label">Canal</label><select class="form-select" id="co-channel-128"><option>WhatsApp</option><option>Correo</option><option>WhatsApp y correo</option></select></div><div class="form-group"><label class="form-label">Prioridad</label><select class="form-select" id="co-priority-128"><option>Normal</option><option>Alta</option><option>Urgente</option></select></div><div class="form-group"><label class="form-label">Responder antes de</label><input class="form-input" id="co-deadline-128" type="datetime-local"></div><div class="form-group"><label class="form-label">Responsable</label><input class="form-input" id="co-owner-128" placeholder="Responsable de la convocatoria"></div><div class="form-group full"><div class="cloud-note">Solo se consideran personas disponibles, no restringidas, con especialidad requerida, datos de contacto y consentimiento vigente.</div></div>`);
    document.getElementById("co-owner-128").value = tenantUser()?.nombre || S.empresa?.representante || "";
  }

  window.openCalloutFollowUp128 = function (id) {
    const callout = (S.callouts || []).find((row) => row.id === id);
    if (!callout) return;
    const recipients = callout.recipients || [];
    const labels = { enviada: "Enviada", pendiente: "Pendiente", confirmada: "Confirmada", rechazada: "Rechazada", sin_respuesta: "Sin respuesta", asignada: "Asignada" };
    openForm("Seguimiento de convocatoria", `<div class="cloud-note"><b>${esc(callout.title || "Convocatoria")}</b><br>${esc(typeof mantNombre === "function" ? mantNombre(callout.mantId) : "Orden de servicio")} · Responsable: ${esc(callout.responsible || "—")} · Responder antes de: ${esc(callout.responseDeadline || "Sin plazo")}</div><div class="table-wrap" style="margin-top:14px;"><table><thead><tr><th>Persona</th><th>Especialidad</th><th>Estado</th><th>Respuesta / nota</th><th></th></tr></thead><tbody>${recipients.map((recipient) => { const worker = (S.trabajadores || []).find((row) => row.id === recipient.workerId); return `<tr><td><b>${esc(worker?.nombre || "Persona")}</b><div class="worker-rut">${esc(worker?.tel || worker?.email || "Sin contacto")}</div></td><td>${esc(worker?.especialidad || worker?.cargo || "—")}</td><td><select class="form-select" onchange="updateCalloutRecipient128('${esc(callout.id)}','${esc(recipient.workerId)}',this.value)">${Object.entries(labels).map(([value, label]) => `<option value="${value}" ${recipient.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></td><td>${esc(recipient.note || "—")}</td><td>${recipient.status === "confirmada" ? `<button class="btn btn-primary btn-sm" onclick="assignCalloutRecipient128('${esc(callout.id)}','${esc(recipient.workerId)}')">Asignar</button>` : "—"}</td></tr>`; }).join("") || '<tr><td colspan="5">Esta convocatoria fue creada antes del seguimiento individual. Cree una nueva convocatoria para obtener el detalle por persona.</td></tr>'}</tbody></table></div><div class="form-group" style="margin-top:14px;"><label class="form-label">Registrar nota general</label><textarea class="form-textarea" id="co-follow-note-128" placeholder="Acuerdo, reenvío, cambio de turno o condición de movilización"></textarea></div>`, () => { const note = document.getElementById("co-follow-note-128")?.value.trim(); if (note) { callout.followUps ||= []; callout.followUps.unshift({ at: new Date().toISOString(), note, user: tenantUser()?.email || "usuario" }); save(); } closeModal("nk128-modal"); renderCommunicationsGovernance(); toast("Seguimiento guardado"); }, "Guardar seguimiento");
  };

  window.updateCalloutRecipient128 = function (calloutId, workerId, status) {
    const callout = (S.callouts || []).find((row) => row.id === calloutId);
    const recipient = callout?.recipients?.find((row) => row.workerId === workerId);
    if (!recipient) return;
    recipient.status = status;
    recipient.respondedAt = status === "enviada" || status === "pendiente" ? "" : new Date().toISOString();
    callout.respondieron = callout.recipients.filter((row) => !["enviada", "pendiente", "sin_respuesta"].includes(row.status)).length;
    callout.asignados = callout.recipients.filter((row) => row.status === "asignada").length;
    S.communicationHistory.unshift({ id: `ch_${Date.now()}`, type: "respuesta", calloutId, sentAt: new Date().toISOString(), recipients: 1, channel: callout.channel || "WhatsApp", status, workerId });
    save(); renderCommunicationsGovernance(); toast("Respuesta actualizada");
  };

  window.assignCalloutRecipient128 = function (calloutId, workerId) {
    const callout = (S.callouts || []).find((row) => row.id === calloutId);
    const worker = (S.trabajadores || []).find((row) => row.id === workerId);
    const recipient = callout?.recipients?.find((row) => row.workerId === workerId);
    if (!callout || !worker || !recipient) return;
    if (worker.bloqueado || worker.operationalStatus === "restringido" || worker.operationalStatus === "bloqueado") return toast("La persona está restringida y no puede asignarse", "err");
    if (!(S.asignaciones || []).some((row) => row.trabId === workerId && row.mantId === callout.mantId)) S.asignaciones.push({ id: `asig_call_${Date.now()}`, trabId: workerId, mantId: callout.mantId, fecha: today(), origin: "convocatoria" });
    worker.disponibilidad = "asignado";
    recipient.status = "asignada";
    recipient.assignedAt = new Date().toISOString();
    callout.asignados = callout.recipients.filter((row) => row.status === "asignada").length;
    S.communicationHistory.unshift({ id: `ch_${Date.now()}`, type: "asignación", calloutId, sentAt: new Date().toISOString(), recipients: 1, channel: callout.channel || "WhatsApp", status: "asignada", workerId });
    save(); renderCommunicationsGovernance(); openCalloutFollowUp128(calloutId); toast("Persona asignada a la orden de servicio");
  };

  window.openCommunicationTemplate128 = function () {
    openForm("Nueva plantilla de comunicación", `<div class="form-grid"><div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="nk128-comm-name"></div><div class="form-group"><label class="form-label">Canal</label><select class="form-select" id="nk128-comm-channel"><option>WhatsApp</option><option>Correo</option><option>Ambos</option></select></div><div class="form-group full"><label class="form-label">Mensaje</label><textarea class="form-textarea" id="nk128-comm-body"></textarea></div><div class="form-group full"><label><input type="checkbox" id="nk128-comm-approved"> Aprobada para uso</label></div></div>`, () => {
      const name = document.getElementById("nk128-comm-name").value.trim(), body = document.getElementById("nk128-comm-body").value.trim();
      if (!name || !body) return toast("Completa nombre y mensaje", "err");
      S.communicationTemplates.push({ id: `ct_${Date.now()}`, name, body, channel: document.getElementById("nk128-comm-channel").value, approved: document.getElementById("nk128-comm-approved").checked });
      save(); closeModal("nk128-modal"); renderCommunicationsGovernance(); toast("Plantilla guardada");
    });
  };

  function renderPortalReviewQueue() {
    upsertAfterHeader("acreditacion-mandante", "nk128-portal-review", `<div class="card" id="nk128-portal-review" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Portal externo de revisión</div><div class="card-subtitle">El cliente puede revisar, observar o aprobar antecedentes según su permiso.</div></div><button class="btn btn-secondary btn-sm" onclick="nav('operaciones-cloud')">Administrar accesos</button></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Entidad</th><th>Cliente</th><th>Revisor</th><th>Resultado</th><th>Observación</th></tr></thead><tbody>${S.portalReviews.map((row) => `<tr><td>${esc(row.at?.slice(0, 10))}</td><td>${esc(row.entity)}</td><td>${esc(minaNombre(row.clientId))}</td><td>${esc(row.reviewer)}</td><td><span class="badge ${row.result === "aprobado" ? "badge-ok" : "badge-warn"}">${esc(row.result)}</span></td><td>${esc(row.note)}</td></tr>`).join("") || '<tr><td colspan="6">Sin revisiones externas registradas.</td></tr>'}</tbody></table></div></div>`);
  }

  function documentScore(row) {
    const checks = row.checks || row.controls || {};
    const values = ["ocr", "signature", "qr", "photo", "integrity", "issuer"].map((key) => Boolean(checks[key] ?? row[key]));
    return Math.round(values.filter(Boolean).length / values.length * 100);
  }

  function renderAuditConfidence() {
    const rows = S.documentVerifications || S.documentReviews || [];
    upsertAfterHeader("auditoria", "nk128-audit-confidence", `<div class="card" id="nk128-audit-confidence" style="margin-bottom:16px;"><div class="card-header"><div><div class="card-title">Confianza documental y revisión humana</div><div class="card-subtitle">OCR, QR, firma, fotografía, integridad y emisor generan un score; la aprobación final siempre corresponde a una persona.</div></div></div><div class="table-wrap"><table><thead><tr><th>Documento</th><th>Entidad</th><th>Score</th><th>Revisión humana</th></tr></thead><tbody>${rows.slice(0, 20).map((row) => { const score = documentScore(row); return `<tr><td><b>${esc(row.documentType || row.type || "Documento")}</b></td><td>${esc(row.entityId || row.entity || "—")}</td><td><span class="badge ${score >= 80 ? "badge-ok" : score >= 50 ? "badge-warn" : "badge-err"}">${score}%</span></td><td>${esc(row.humanStatus || row.status || "Pendiente")}</td></tr>`; }).join("") || '<tr><td colspan="4">Sin validaciones registradas. Use Acreditación documental inteligente en Centro Operativo.</td></tr>'}</tbody></table></div></div>`);
  }

  function parseCsvLine(line) {
    const result = []; let value = "", quote = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') { if (quote && line[index + 1] === '"') { value += '"'; index += 1; } else quote = !quote; }
      else if (char === "," && !quote) { result.push(value); value = ""; }
      else value += char;
    }
    result.push(value); return result;
  }

  function installImportPreview() {
    const input = document.getElementById("imp-file");
    if (!input || input.dataset.nk128) return;
    input.dataset.nk128 = "1";
    input.closest(".card")?.insertAdjacentHTML("beforeend", '<div id="nk128-import-preview" class="card" style="margin-top:14px;"><div class="card-title">Vista previa y control de duplicados</div><div class="nk128-muted">Seleccione un archivo para revisar las primeras filas antes de importar.</div></div>');
    input.addEventListener("change", async () => {
      const file = input.files?.[0], host = document.getElementById("nk128-import-preview");
      if (!file || !host) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;
      if (file.name.toLowerCase().endsWith(".json")) {
        try { const value = JSON.parse(text); host.innerHTML = `<div class="card-title">Respaldo JSON válido</div><div class="cloud-note">${Object.keys(value || {}).length} secciones detectadas. La importación aplicará las validaciones del servidor.</div>`; }
        catch (error) { host.innerHTML = `<div class="card-title">Archivo inválido</div><div class="cloud-note">${esc(error.message)}</div>`; }
        return;
      }
      const allRows = lines.map(parseCsvLine);
      const rows = allRows.slice(0, 7);
      const headers = allRows[0];
      const rutIndex = headers.findIndex((header) => /rut/i.test(header));
      const existing = new Set((S.trabajadores || []).map((row) => String(row.rut || "").replace(/\W/g, "").toLowerCase()));
      const imported = new Set();
      const errors = [];
      allRows.slice(1).forEach((row, index) => {
        const rut = rutIndex >= 0 ? String(row[rutIndex] || "").replace(/\W/g, "").toLowerCase() : "";
        if (rut && existing.has(rut)) errors.push(`Fila ${index + 2}: RUT duplicado`);
        if (rut && imported.has(rut)) errors.push(`Fila ${index + 2}: RUT repetido dentro del archivo`);
        if (rut) imported.add(rut);
        if (row.length !== headers.length) errors.push(`Fila ${index + 2}: cantidad de columnas incorrecta`);
      });
      S.importValidations.unshift({ id: `iv_${Date.now()}`, fileName: file.name, at: new Date().toISOString(), rows: lines.length - 1, errors });
      save();
      host.innerHTML = `<div class="card-header"><div><div class="card-title">Vista previa: ${esc(file.name)}</div><div class="card-subtitle">${lines.length - 1} registros · ${errors.length} observaciones detectadas en el archivo completo</div></div>${errors.length ? '<button class="btn btn-secondary btn-sm" onclick="downloadImportErrors128()">Descargar errores</button>' : '<span class="badge badge-ok">Sin duplicados detectados</span>'}</div><div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((value) => `<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${errors.slice(0, 20).map((error) => `<div class="badge badge-err">${esc(error)}</div>`).join(" ")}${errors.length > 20 ? `<div class="nk128-muted">Se muestran 20 de ${errors.length} observaciones. Descargue el reporte completo.</div>` : ""}`;
    });
  }

  window.downloadImportErrors128 = function () {
    const latest = S.importValidations?.[0];
    if (!latest?.errors?.length) return toast("No existen errores para descargar", "err");
    exportCSV([["Archivo", "Error"], ...latest.errors.map((error) => [latest.fileName, error])], `errores_importacion_${today()}.csv`);
  };

  function renderWithTemporalCollection(key, fields, renderer, args) {
    const original = S[key];
    const range = temporalRange();
    S[key] = (original || []).filter((row) => fields.some((field) => dateInside(row?.[field], range)));
    try { return renderer(...args); }
    finally { S[key] = original; }
  }

  function enhance(page) {
    ensureState();
    installTemporalToolbar();
    if (page === "dashboard") { renderDashboardPreferences(); renderTemporalAnalysis(); }
    if (page === "alertas") renderManagedAlerts();
    if (page === "operaciones-cloud") renderOperationsPlanning();
    if (page === "oportunidades") renderOpportunityProjection();
    if (page === "contratos") renderContractReminders();
    if (page === "subcontratos") renderSubcontractCompliance();
    if (page === "epp") renderEppInventoryBridge();
    if (page === "turnos") renderReadiness129("turnos");
    if (page === "cursos") { renderTrainingMatrix(); renderReadiness129("cursos"); }
    if (page === "protocolos") { renderHealthMatrix(); renderReadiness129("protocolos"); }
    if (page === "llamados") renderCommunicationsGovernance();
    if (page === "acreditacion-mandante") renderPortalReviewQueue();
    if (page === "auditoria") renderAuditConfidence();
    if (page === "transferencia") installImportPreview();
  }

  function install() {
    if (typeof S === "undefined" || typeof renderPage !== "function") return window.setTimeout(install, 100);
    ensureState(); installModal();
    const baseSnapshotState = snapshotState;
    snapshotState = function () {
      const snapshot = baseSnapshotState();
      ENTERPRISE_KEYS.forEach((key) => { snapshot[key] = S[key]; });
      return JSON.parse(JSON.stringify(snapshot));
    };
    const baseApplyState = applyState;
    applyState = function (data) {
      baseApplyState(data);
      ENTERPRISE_KEYS.forEach((key) => {
        const emptyValue = ENTERPRISE_OBJECT_KEYS.has(key) ? {} : [];
        S[key] = data?.[key] !== undefined ? data[key] : emptyValue;
      });
      ensureState();
    };
    const baseRenderPage = renderPage;
    renderPage = function (page) { baseRenderPage(page); window.setTimeout(() => enhance(page), 0); };
    const baseOpenMant = openMantDetalle;
    openMantDetalle = function (id) { baseOpenMant(id); window.setTimeout(() => injectServiceManagement(id), 0); };
    const baseRenderAlerts = renderAlertas;
    renderAlertas = function () { baseRenderAlerts(); renderManagedAlerts(); };
    if (typeof renderTurnos === "function") {
      const baseRenderTurnos = renderTurnos;
      renderTurnos = function (...args) { return renderWithTemporalCollection("turnos", ["fecha"], baseRenderTurnos, args); };
    }
    if (typeof renderIncidentes === "function") {
      const baseRenderIncidentes = renderIncidentes;
      renderIncidentes = function (...args) { return renderWithTemporalCollection("incidentes", ["fecha", "createdAt"], baseRenderIncidentes, args); };
    }
    if (typeof renderLlamados === "function") {
      const baseRenderLlamados = renderLlamados;
      renderLlamados = function (...args) { return renderWithTemporalCollection("callouts", ["fecha", "createdAt"], baseRenderLlamados, args); };
    }
    installCalloutForm128();
    if (typeof window.sendCallout === "function") {
      const baseSendCallout = window.sendCallout;
      window.sendCallout = function (...args) {
        const previous = (S.callouts || []).length;
        const result = baseSendCallout(...args);
        const finish = () => {
          const callout = (S.callouts || [])[previous];
          if (!callout || callout.recipients?.length) return;
          enrichCallout128(callout);
          renderCommunicationsGovernance();
        };
        if (result && typeof result.then === "function") result.then(finish).catch(() => {}); else finish();
        return result;
      };
    }
    const page = document.querySelector(".page.active")?.id?.replace("page-", "") || "dashboard";
    window.setTimeout(() => enhance(page), 0);
    window.NexoKlarEnterprise = { version: VERSION, enhance, communicationOptions: communicationOptions128, enrichCallout: enrichCallout128, renderCommunications: renderCommunicationsGovernance };
  }

  window.addEventListener("load", install);
})();
