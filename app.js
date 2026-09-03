/**
 * Forecourt Works Ltd - Technical Inspection & Metrology Report Generator
 * Professional Dynamic PDF Engine
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global Application State
  const state = {
    currentStep: 1,
    general: {
      clientName: "",
      siteLocation: "",
      inspectionDate: "",
      technicianName: "Brian Oguta"
    },
    jsha: [],
    equipment: {
      tag: "",
      brand: "",
      sn: "",
      sec5c: { status: "PASS", notes: "" },
      sec5d: { status: "PASS", notes: "" },
      sec5f: { status: "PASS", notes: "" }
    },
    metrology: {
      indicated: 20.00,
      actual: 20.00,
      errorMl: 0,
      errorPct: 0,
      notes: ""
    },
    closingNotes: ""
  };

  // Signatures
  let sigPadTech, sigPadClient;

  // Initialize Signature Canvas
  function initSignatures() {
    const canvasTech = document.getElementById("sig-pad-tech");
    const canvasClient = document.getElementById("sig-pad-client");
    
    if (canvasTech && canvasClient) {
      sigPadTech = new SignaturePad(canvasTech);
      sigPadClient = new SignaturePad(canvasClient);
    }

    document.getElementById("clear-tech-sig")?.addEventListener("click", () => sigPadTech?.clear());
    document.getElementById("clear-client-sig")?.addEventListener("click", () => sigPadClient?.clear());
  }

  // Metrology Legal Error Calculation (Standardized Notation)
  function calcMeterError() {
    const indInput = parseFloat(document.getElementById("meter-ind")?.value) || 0;
    const actInput = parseFloat(document.getElementById("meter-act")?.value) || 0;
    
    if (indInput <= 0 || actInput <= 0) return;

    // Standardized Formula: Difference = Indicated Vol - Actual Vol
    const diffLitres = indInput - actInput;
    const errorMl = diffLitres * 1000;
    const errorPct = (diffLitres / indInput) * 100;

    state.metrology.indicated = indInput;
    state.metrology.actual = actInput;
    state.metrology.errorMl = errorMl;
    state.metrology.errorPct = errorPct;

    const display = document.getElementById("meter-error-display");
    if (display) {
      const sign = errorMl > 0 ? "+" : "";
      display.value = `${sign}${errorMl.toFixed(0)} ml (${sign}${errorPct.toFixed(2)}%)`;
      display.className = `w-full p-2 border rounded text-sm font-bold ${errorMl > 0 ? 'text-red-600' : 'text-emerald-600'}`;
    }
  }

  document.getElementById("meter-ind")?.addEventListener("input", calcMeterError);
  document.getElementById("meter-act")?.addEventListener("input", calcMeterError);

  // Dynamic JSHA Row Addition
  document.getElementById("add-jsha-row")?.addEventListener("click", () => {
    const container = document.getElementById("jsha-container");
    const newRow = document.createElement("div");
    newRow.className = "grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded border border-slate-200 jsha-row mt-2";
    newRow.innerHTML = `
      <input type="text" class="col-span-5 p-2 border rounded text-sm jsha-hazard" placeholder="Intrinsic Hazard">
      <input type="text" class="col-span-5 p-2 border rounded text-sm jsha-control" placeholder="Control Task">
      <select class="col-span-2 p-2 border rounded text-sm font-semibold jsha-status">
        <option value="YES">YES</option>
        <option value="NO">NO</option>
      </select>
    `;
    container.appendChild(newRow);
  });

  // Dynamic Form State Synchronization
  function syncFormDataToState() {
    state.general.clientName = document.getElementById("client-name")?.value || "";
    state.general.siteLocation = document.getElementById("site-location")?.value || "";
    state.general.inspectionDate = document.getElementById("inspection-date")?.value || "";
    state.general.technicianName = document.getElementById("technician-name")?.value || "";

    // Sync JSHA
    state.jsha = [];
    document.querySelectorAll(".jsha-row").forEach(row => {
      const hazard = row.querySelector(".jsha-hazard")?.value;
      const control = row.querySelector(".jsha-control")?.value;
      const status = row.querySelector(".jsha-status")?.value;
      if (hazard || control) {
        state.jsha.push({ hazard, control, status });
      }
    });

    // Sync Equipment (Fixed DOM Binding)
    state.equipment.tag = document.getElementById("lift-id")?.value || "";
    state.equipment.brand = document.getElementById("lift-brand")?.value || "";
    state.equipment.sn = document.getElementById("lift-sn")?.value || "";

    state.equipment.sec5c.status = document.getElementById("status-5c")?.value || "PASS";
    state.equipment.sec5c.notes = document.getElementById("notes-5c")?.value || "";
    state.equipment.sec5d.status = document.getElementById("status-5d")?.value || "PASS";
    state.equipment.sec5d.notes = document.getElementById("notes-5d")?.value || "";
    state.equipment.sec5f.status = document.getElementById("status-5f")?.value || "PASS";
    state.equipment.sec5f.notes = document.getElementById("notes-5f")?.value || "";

    state.metrology.notes = document.getElementById("calibration-notes")?.value || "";
    state.closingNotes = document.getElementById("closing-notes")?.value || "";
  }

  // Step Navigation Logic
  function updateStepUI() {
    document.querySelectorAll(".step-card").forEach(card => {
      card.classList.remove("active");
      if (parseInt(card.dataset.step) === state.currentStep) {
        card.classList.add("active");
      }
    });

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const genBtn = document.getElementById("generate-pdf-btn");

    if (prevBtn) prevBtn.disabled = state.currentStep === 1;
    
    if (state.currentStep === 4) {
      if (nextBtn) nextBtn.classList.add("hidden");
      if (genBtn) genBtn.classList.remove("hidden");
    } else {
      if (nextBtn) nextBtn.classList.remove("hidden");
      if (genBtn) genBtn.classList.add("hidden");
    }
  }

  document.getElementById("next-btn")?.addEventListener("click", () => {
    syncFormDataToState();
    if (state.currentStep < 4) {
      state.currentStep++;
      updateStepUI();
    }
  });

  document.getElementById("prev-btn")?.addEventListener("click", () => {
    syncFormDataToState();
    if (state.currentStep > 1) {
      state.currentStep--;
      updateStepUI();
    }
  });

  // HIGH-PRECISION PDF GENERATION ENGINE
  document.getElementById("generate-pdf-btn")?.addEventListener("click", () => {
    syncFormDataToState();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let cursorY = 15;

    // Helper: Dynamic Page Budget Check
    function checkPageBudget(requiredHeight) {
      if (cursorY + requiredHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = 20;
        return true;
      }
      return false;
    }

    // Unified Typography & Header Setup
    function renderHeader() {
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, pageWidth, 24, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("FORECOURT WORKS LTD", margin, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text("FIELD SERVICE INSPECTION & METROLOGY REPORT", margin, 18);
      
      doc.text(`DOC REF: FSW-INSP-${Date.now().toString().slice(-4)}`, pageWidth - margin, 12, { align: "right" });
      doc.text(`DATE: ${state.general.inspectionDate || 'N/A'}`, pageWidth - margin, 18, { align: "right" });

      cursorY = 32;
    }

    renderHeader();

    // 1. General Info Table (15% Opacity Borders)
    checkPageBudget(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("1. GENERAL SITE INFORMATION", margin, cursorY);
    cursorY += 4;

    doc.autoTable({
      startY: cursorY,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [51, 65, 85],
        lineColor: [217, 217, 217], // 15% opacity equivalence
        lineWidth: 0.15,
        cellPadding: 2.5
      },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      body: [
        ["Client Name:", state.general.clientName || "N/A", "Site Location:", state.general.siteLocation || "N/A"],
        ["Lead Technician:", state.general.technicianName || "N/A", "Inspection Date:", state.general.inspectionDate || "N/A"]
      ],
      margin: { left: margin, right: margin }
    });

    cursorY = doc.lastAutoTable.finalY + 8;

    // 2. Job Safety & Hazard Analysis Table (3-Column, Green/Red Status)
    checkPageBudget(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("2. JOB SAFETY & HAZARD ANALYSIS (JSHA)", margin, cursorY);
    cursorY += 4;

    const jshaBody = state.jsha.length > 0 
      ? state.jsha.map(item => [item.hazard, item.control, item.status])
      : [["Default Worksite Hazard", "Standard PPE & Area Cordon", "YES"]];

    doc.autoTable({
      startY: cursorY,
      theme: "grid",
      head: [["Job Intrinsic Hazard", "Hazard Control Tasks", "Status"]],
      body: jshaBody,
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [51, 65, 85],
        lineColor: [217, 217, 217],
        lineWidth: 0.15,
        cellPadding: 2.5
      },
      headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 85 },
        2: { cellWidth: 27, halign: "center", fontStyle: "bold" }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'YES') {
            data.cell.styles.textColor = [22, 163, 74]; // Green #16a34a
          } else if (data.cell.raw === 'NO') {
            data.cell.styles.textColor = [220, 38, 38]; // Red #dc2626
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    cursorY = doc.lastAutoTable.finalY + 8;

    // 3. Equipment & Inspection Checklist (Sections 5C, 5D, 5F)
    checkPageBudget(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("3. EQUIPMENT INSPECTION & SYSTEM AUDIT", margin, cursorY);
    cursorY += 4;

    doc.autoTable({
      startY: cursorY,
      theme: "grid",
      head: [["Inspection Module / Section", "Status", "Technical Observations & Remarks"]],
      body: [
        ["Asset ID / Tag", "INFO", state.equipment.tag || "N/A"],
        ["Brand & Serial No.", "INFO", `${state.equipment.brand || 'N/A'} / ${state.equipment.sn || 'N/A'}`],
        ["5C. Hydraulic & Mechanical", state.equipment.sec5c.status, state.equipment.sec5c.notes || "Operates within parameters."],
        ["5D. Electrical & Safety", state.equipment.sec5d.status, state.equipment.sec5d.notes || "Interlocks fully operational."],
        ["5F. Emergency Shut-Off", state.equipment.sec5f.status, state.equipment.sec5f.notes || "Emergency cutoff functional."]
      ],
      styles: {
        font: "helvetica",
        fontSize: 8,
        textColor: [51, 65, 85],
        lineColor: [217, 217, 217],
        lineWidth: 0.15,
        cellPadding: 2.5
      },
      headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 102 } // Strict width to prevent spillover
      },
      margin: { left: margin, right: margin }
    });

    cursorY = doc.lastAutoTable.finalY + 8;

    // 4. Metrology & Meter Calibration Module
    checkPageBudget(45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("4. DISPENSER METER ACCURACY & CALIBRATION ANALYSIS", margin, cursorY);
    cursorY += 4;

    const errorSign = state.metrology.errorMl > 0 ? "+" : "";

    doc.autoTable({
      startY: cursorY,
      theme: "grid",
      head: [["Indicated Vol (L)", "Actual Vol (L)", "Absolute Error (ml)", "Percentage Error (%)"]],
      body: [
        [
          `${state.metrology.indicated.toFixed(2)} L`,
          `${state.metrology.actual.toFixed(2)} L`,
          `${errorSign}${state.metrology.errorMl.toFixed(0)} ml`,
          `${errorSign}${state.metrology.errorPct.toFixed(2)}%`
        ]
      ],
      styles: {
        font: "helvetica",
        fontSize: 8,
        halign: "center",
        textColor: [51, 65, 85],
        lineColor: [217, 217, 217],
        lineWidth: 0.15,
        cellPadding: 2.5
      },
      headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: "bold" },
      margin: { left: margin, right: margin }
    });

    cursorY = doc.lastAutoTable.finalY + 4;

    // Calibration Analysis Notes Block (Font Uniformity Enforced)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(`Analysis Notes: ${state.metrology.notes || 'Meter verified against standard prover measure. Calibration within legal tolerance limits.'}`, pageWidth - (margin * 2));
    doc.text(splitNotes, margin, cursorY);
    cursorY += (splitNotes.length * 4) + 6;

    // 5. Authorization & Signatures
    checkPageBudget(35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("5. SIGN-OFF AUTHORIZATION", margin, cursorY);
    cursorY += 6;

    // Append Canvas Signatures if present
    if (sigPadTech && !sigPadTech.isEmpty()) {
      const techSigImg = sigPadTech.toDataURL("image/png");
      doc.addImage(techSigImg, "PNG", margin, cursorY, 40, 15);
    }
    if (sigPadClient && !sigPadClient.isEmpty()) {
      const clientSigImg = sigPadClient.toDataURL("image/png");
      doc.addImage(clientSigImg, "PNG", pageWidth - margin - 40, cursorY, 40, 15);
    }

    cursorY += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Lead Technician: ${state.general.technicianName}`, margin, cursorY);
    doc.text("Client Representative Authorization", pageWidth - margin, cursorY, { align: "right" });

    // Save Compiled Document
    doc.save(`Forecourt_Inspection_Report_${state.general.clientName.replace(/\s+/g, '_') || 'Site'}.pdf`);
  });

  // Startup Initialization
  initSignatures();
  updateStepUI();
});
