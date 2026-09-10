(function () {
  "use strict";

  const guidance = {
    dashboard: "Revise aquí las prioridades de la operación y acceda al detalle que requiere atención.",
    mineras: "Use Clientes para consultar contratos, órdenes de servicio, personas, documentos y actividad relacionada.",
    contratos: "Controle vigencia, alcance, documentos, versiones y firmas sin perder el historial contractual.",
    mantenciones: "Revise aquí si la orden está preparada para comenzar y qué brechas debe resolver.",
    reclutamiento: "Busque personal disponible y avance desde el contacto inicial hasta la contratación y habilitación.",
    trabajadores: "Consulte la ficha completa, asignaciones, documentación, EPP, formación y estado operativo de cada persona.",
    "personal-planta": "Administre la dotación permanente, sus cargos, turnos, documentos y asignaciones activas.",
    epp: "Registre entregas, tallas, costos, vida útil, renovaciones y evidencias por trabajador.",
    hoteleria: "Asigne alojamientos por fecha y controle camas disponibles, ocupadas y próximas a liberarse.",
    vehiculos: "Controle responsables, documentos, costos y vencimientos de vehículos y equipos.",
    "acreditacion-empresa": "Renueve los documentos de la empresa sin perder versiones ni antecedentes anteriores.",
    "acreditacion-mandante": "Valide si empresas, personas, vehículos y servicios cumplen los requisitos del cliente.",
    subcontratos: "Controle contratos, documentos laborales, renovaciones y seguimiento de cada subcontratista.",
    credenciales: "Gestione credenciales de acceso, archivos asociados y alertas de vencimiento.",
    incidentes: "Registre hallazgos, evidencias, responsables, acciones correctivas y cierre.",
    auditoria: "Revise documentos, observaciones, aprobaciones y evidencia de cada validación.",
    "operaciones-cloud": "Coordine el estado de las órdenes, recursos, inventario, alertas y trazabilidad operativa.",
    "libro-obras": "Registre avances, instrucciones, acuerdos, evidencias y firmas asociados a cada orden.",
    reportes: "Genere información filtrada por cliente, contrato, orden, persona, fecha y estado.",
    configuracion: "Personalice catálogos y reglas exclusivas de esta empresa sin afectar a otros clientes.",
    usuarios: "Administre quién puede consultar o modificar cada área del espacio privado.",
    privacidad: "Controle conservación, acceso y tratamiento de la información de la empresa."
  };

  function currentPage() {
    const active = document.querySelector(".page.active");
    return active && active.id ? active.id.replace(/^page-/, "") : "";
  }

  function render(page) {
    document.querySelectorAll(".nk-page-guidance").forEach((node) => node.remove());
    const message = guidance[page];
    const pageNode = document.getElementById("page-" + page);
    const header = pageNode && pageNode.querySelector(".section-header");
    if (!message || !header) return;
    const note = document.createElement("div");
    note.className = "nk-page-guidance";
    note.textContent = message;
    header.insertAdjacentElement("afterend", note);
  }

  document.addEventListener("click", (event) => {
    const item = event.target.closest("#sidebar .nav-item");
    if (!item) return;
    const match = String(item.getAttribute("onclick") || "").match(/nav\('([^']+)'\)/);
    if (match) window.setTimeout(() => render(match[1]), 0);
  });

  window.addEventListener("load", () => render(currentPage()));
  window.NexoKlarGuidance = { render };
})();
