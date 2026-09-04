/* Nexo Klar V16.8: gobierno y exportación verificable del Libro de Obra. */
(function () {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
  const approvalLabels = { redactor: 'Redactor', supervisor: 'Supervisor', cliente: 'Cliente', inspector: 'Inspector' };
  const decisionLabels = { aprobado: 'Aprobado', observado: 'Observado', rechazado: 'Rechazado' };
  const state = () => window.NexoKlarRuntime?.state;
  const user = () => window.NexoKlarRuntime?.user;

  const mapCloudBase = window.workBookMapCloudV125;
  if (typeof mapCloudBase === 'function') {
    window.workBookMapCloudV125 = function (row) {
      return { ...mapCloudBase(row), approvals: row.approvals || [] };
    };
  }

  function ensureApprovalModal() {
    if (document.getElementById('modal-work-book-approval-v168')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="modal-work-book-approval-v168"><div class="modal">
        <div class="modal-header"><div class="modal-title">Registrar revisión del Libro de Obra</div><button class="modal-close" type="button" onclick="closeModal('modal-work-book-approval-v168')">✕</button></div>
        <form onsubmit="saveWorkBookApprovalV168(event)"><div class="modal-body">
          <input type="hidden" id="wb-approval-entry-v168">
          <div class="cloud-note" id="wb-approval-context-v168">La decisión quedará registrada en el historial de la anotación.</div>
          <div class="form-grid" style="margin-top:14px;">
            <div class="form-group"><label class="form-label">Rol de revisión *</label><select class="form-select" id="wb-approval-role-v168"><option value="redactor">Redactor</option><option value="supervisor">Supervisor</option><option value="cliente">Cliente</option><option value="inspector">Inspector</option></select></div>
            <div class="form-group"><label class="form-label">Decisión *</label><select class="form-select" id="wb-approval-decision-v168"><option value="aprobado">Aprobado</option><option value="observado">Observado</option><option value="rechazado">Rechazado</option></select></div>
            <div class="form-group full"><label class="form-label">Comentario o fundamento *</label><textarea class="form-textarea" id="wb-approval-comment-v168" minlength="3" maxlength="2000" required placeholder="Indique qué se revisó, la decisión y el siguiente paso."></textarea></div>
          </div>
        </div><div class="modal-footer"><button class="btn btn-secondary" type="button" onclick="closeModal('modal-work-book-approval-v168')">Cancelar</button><button class="btn btn-primary" type="submit">Registrar revisión</button></div></form>
      </div></div>`);
  }

  window.openWorkBookApprovalV168 = async function (id) {
    const row = await window.workBookDetailRecordV125(id);
    if (!row) return window.toast('Anotación no encontrada', 'err');
    if (['firmado', 'cerrado'].includes(row.status)) return window.toast('La anotación está protegida y no admite nuevas revisiones', 'warn');
    ensureApprovalModal();
    document.getElementById('wb-approval-entry-v168').value = id;
    document.getElementById('wb-approval-context-v168').textContent = `${row.folio || 'LOCAL'} · Anotación ${row.entryNumber || '—'} · ${row.subject || ''}`;
    document.getElementById('wb-approval-role-v168').value = 'supervisor';
    document.getElementById('wb-approval-decision-v168').value = 'aprobado';
    document.getElementById('wb-approval-comment-v168').value = '';
    window.openModal('modal-work-book-approval-v168');
  };

  window.saveWorkBookApprovalV168 = async function (event) {
    event.preventDefault();
    const id = document.getElementById('wb-approval-entry-v168').value;
    const role = document.getElementById('wb-approval-role-v168').value;
    const decision = document.getElementById('wb-approval-decision-v168').value;
    const comment = document.getElementById('wb-approval-comment-v168').value.trim();
    if (comment.length < 3) return window.toast('Incluye un fundamento para la revisión', 'err');
    try {
      if (window.workBookCloudV125()) {
        await window.AccesoMinaCloud.api(`/work-books/entries/${encodeURIComponent(id)}/approvals`, { method: 'POST', body: { role, decision, comment } });
      } else {
        const row = (state()?.workBookEntries || []).find(item => item.id === id);
        if (!row) return window.toast('Anotación no encontrada', 'err');
        row.approvals = Array.isArray(row.approvals) ? row.approvals : [];
        const previous = row.approvals.findIndex(item => item.role === role);
        const approval = { id: `wba_${Date.now()}`, role, decision, comment, decidedAt: new Date().toISOString(), decidedBy: user()?.email || 'usuario' };
        if (previous >= 0) row.approvals.splice(previous, 1, approval); else row.approvals.unshift(approval);
        if (decision !== 'aprobado') row.status = 'observado';
        row.history = Array.isArray(row.history) ? row.history : [];
        row.history.unshift({ action: 'aprobacion_registrada', reason: `${approvalLabels[role]}: ${decisionLabels[decision]} · ${comment}`, changedAt: approval.decidedAt, changedBy: approval.decidedBy });
        window.NexoKlarRuntime.persist();
      }
      window.closeModal('modal-work-book-approval-v168');
      window.closeModal('modal-work-book-detail-v125');
      await window.renderWorkBookV125();
      window.renderWorkBookDashboardV125();
      window.toast('Revisión registrada en el historial');
    } catch (error) { window.toast(error.message || 'No fue posible registrar la revisión', 'err'); }
  };

  window.exportWorkBookRecordV168 = async function (id) {
    const row = await window.workBookDetailRecordV125(id);
    if (!row) return window.toast('Anotación no encontrada', 'err');
    const scope = window.workBookScopeNamesV125(row);
    const history = row.history || [];
    const approvals = row.approvals || [];
    const signatures = row.signatureRequests || [];
    const verification = `${row.folio || 'LOCAL'}-${row.entryNumber || '0'}-${String(row.createdAt || row.occurredAt || '').slice(0, 10)}`;
    const print = window.open('', '_blank');
    if (!print) return window.toast('Permite ventanas emergentes para generar el comprobante', 'warn');
    print.opener = null;
    print.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(row.folio)} - Anotación ${esc(row.entryNumber)}</title><style>body{font-family:Arial,sans-serif;color:#151729;margin:42px;line-height:1.45}.head{border-bottom:3px solid #db0077;padding-bottom:16px}.folio{color:#4c2d97;font-weight:700}.section{margin-top:28px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #d8dbea;padding:8px;text-align:left;vertical-align:top}th{background:#f5f3fa}.tag{display:inline-block;padding:3px 8px;border-radius:10px;background:#f2e9f6;margin-right:5px}footer{position:fixed;bottom:20px;color:#5d6075;font-size:10px}</style></head><body><header class="head"><div class="folio">NEXO KLAR · LIBRO DE OBRA</div><h1>${esc(row.folio || 'LOCAL')} · Anotación ${esc(row.entryNumber || '—')}</h1><p>Comprobante operativo con historial y evidencia registrada.</p></header><section class="section"><h2>${esc(row.subject)}</h2><p><b>Cliente:</b> ${esc(scope.mine)}<br><b>Contrato:</b> ${esc(scope.contract)}<br><b>Orden de servicio:</b> ${esc(scope.project)}<br><b>Fecha:</b> ${esc(String(row.occurredAt || '').replace('T',' ').slice(0,16))}<br><b>Responsable:</b> ${esc(row.responsible || '—')}<br><b>Compromiso:</b> ${esc(row.dueAt || '—')}<br><b>Estado:</b> ${esc(row.status || 'borrador')}</p><p>${esc(row.body).replace(/\n/g, '<br>')}</p></section><section class="section"><h2>Evidencia</h2><p>${(row.evidenceFiles || []).map(file => `<span class="tag">${esc(file.name)}</span>`).join(' ') || 'Sin evidencia adjunta.'}</p></section><section class="section"><h2>Revisiones</h2><table><thead><tr><th>Rol</th><th>Decisión</th><th>Comentario</th><th>Fecha</th></tr></thead><tbody>${approvals.map(item => `<tr><td>${esc(approvalLabels[item.reviewer_role || item.role] || item.role)}</td><td>${esc(decisionLabels[item.decision] || item.decision)}</td><td>${esc(item.comment)}</td><td>${esc(String(item.decided_at || item.decidedAt || '').replace('T',' ').slice(0,16))}</td></tr>`).join('') || '<tr><td colspan="4">Sin revisiones registradas.</td></tr>'}</tbody></table></section><section class="section"><h2>Firmas</h2><table><thead><tr><th>Firmante</th><th>Estado</th><th>Proveedor</th><th>Fecha</th></tr></thead><tbody>${signatures.map(item => `<tr><td>${esc(item.signer_name || item.signerName)}</td><td>${esc(item.status)}</td><td>${esc(item.provider || 'Pendiente')}</td><td>${esc(String(item.signed_at || item.signedAt || item.requested_at || item.requestedAt || '').replace('T',' ').slice(0,16))}</td></tr>`).join('') || '<tr><td colspan="4">Sin solicitudes de firma registradas.</td></tr>'}</tbody></table></section><section class="section"><h2>Historial</h2><table><thead><tr><th>Fecha</th><th>Acción</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>${history.map(item => `<tr><td>${esc(String(item.changed_at || item.changedAt || '').replace('T',' ').slice(0,16))}</td><td>${esc(item.action)}</td><td>${esc(item.reason || '—')}</td><td>${esc(item.changed_by_name || item.changedBy || 'usuario')}</td></tr>`).join('')}</tbody></table></section><footer>Identificador de verificación: ${esc(verification)} · Emitido ${esc(new Date().toLocaleString('es-CL'))}</footer><script>window.onload=()=>window.print();<\/script></body></html>`);
    print.document.close();
  };

  const openDetailBase = window.openWorkBookDetailV125;
  if (typeof openDetailBase === 'function') {
    window.openWorkBookDetailV125 = async function (id) {
      await openDetailBase(id);
      const row = await window.workBookDetailRecordV125(id);
      const host = document.getElementById('wb-detail-body-v125');
      if (!row || !host || document.getElementById('wb-governance-v168')) return;
      const approvals = row.approvals || [];
      const rows = approvals.map(item => `<tr><td>${esc(approvalLabels[item.reviewer_role || item.role] || item.role)}</td><td><span class="badge ${item.decision === 'aprobado' ? 'badge-ok' : 'badge-err'}">${esc(decisionLabels[item.decision] || item.decision)}</span></td><td>${esc(item.comment)}</td><td>${esc(String(item.decided_at || item.decidedAt || '').replace('T',' ').slice(0,16))}</td></tr>`).join('') || '<tr><td colspan="4">Aún no hay revisiones registradas.</td></tr>';
      host.insertAdjacentHTML('beforeend', `<div class="card" id="wb-governance-v168" style="margin-top:14px;"><div class="card-header"><div><div class="card-title">Revisión y aprobación</div><div class="card-subtitle">Registra la decisión de redacción, supervisión, cliente o inspección, con fundamento trazable.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-secondary btn-sm" type="button" onclick="exportWorkBookRecordV168('${esc(row.id)}')">Generar comprobante PDF</button>${['firmado','cerrado'].includes(row.status) ? '' : `<button class="btn btn-primary btn-sm" type="button" onclick="openWorkBookApprovalV168('${esc(row.id)}')">Registrar revisión</button>`}</div></div><div class="table-wrap" style="margin-top:12px;"><table><thead><tr><th>Rol</th><th>Decisión</th><th>Comentario</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></div></div>`);
    };
  }

  const installBase = window.installWorkBookUiV125;
  if (typeof installBase === 'function') {
    window.installWorkBookUiV125 = function () {
      installBase();
      const csv = document.querySelector('button[onclick="exportWorkBookV125()"]');
      if (csv && !document.getElementById('wb-governance-help-v168')) csv.insertAdjacentHTML('afterend', '<span id="wb-governance-help-v168" class="worker-rut" style="margin-left:8px;">Las revisiones y comprobantes quedan disponibles en la ficha de cada anotación.</span>');
    };
  }
}());
