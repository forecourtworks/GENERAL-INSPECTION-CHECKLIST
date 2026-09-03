document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("calTableBody");
    const addRowBtn = document.getElementById("addRowBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");

    let currentSigTarget = null;
    let signatures = { inspector: null, client: null };

    const sigModal = new bootstrap.Modal(document.getElementById("signatureModal"));
    const canvas = document.getElementById("sigCanvas");
    const ctx = canvas.getContext("2d");
    let isDrawing = false;

    // Default Prover Can size
    function getSelectedProverSize() {
        const checked = document.querySelector('.prover-radio:checked');
        return checked ? parseFloat(checked.value) : 20.0;
    }

    function getSelectedDispenserStatus() {
        const checked = document.querySelector('.status-radio:checked');
        return checked ? checked.value : "New";
    }

    // Initialize 3 default Nozzle rows
    for (let i = 1; i <= 3; i++) addRow(i);

    addRowBtn.addEventListener("click", () => addRow(tableBody.children.length + 1));

    // Global listeners for setting changes
    document.querySelectorAll('.prover-radio, .status-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const proverVol = getSelectedProverSize();
            document.querySelectorAll('.std-input').forEach(input => {
                input.value = proverVol.toFixed(2);
            });
            recalculateAllRows();
        });
    });

    function addRow(nozzleNumber) {
        const proverVol = getSelectedProverSize();
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center fw-bold">${nozzleNumber}</td>
            <td><input type="text" class="table-input ind-input" placeholder="${proverVol.toFixed(2)}" value="${proverVol.toFixed(2)}"></td>
            <td><input type="text" class="table-input std-input" placeholder="${proverVol.toFixed(2)}" value="${proverVol.toFixed(2)}"></td>
            <td><input type="text" class="table-input err-input" readonly placeholder="0.00%"></td>
            <td class="verdict-cell small"></td>
            <td class="analysis-cell small"></td>
        `;
        tableBody.appendChild(tr);
        attachRowEvents(tr);
    }

    function attachRowEvents(row) {
        const indInput = row.querySelector(".ind-input");
        const stdInput = row.querySelector(".std-input");

        [indInput, stdInput].forEach(input => {
            input.addEventListener("blur", (e) => formatAndCalculate(row, e.target));
            input.addEventListener("keyup", (e) => {
                if (e.key === "Enter") formatAndCalculate(row, e.target);
            });
        });
    }

    function formatAndCalculate(row, activeInput) {
        let val = activeInput.value.trim();
        if (val !== "" && !isNaN(val)) {
            activeInput.value = parseFloat(val).toFixed(2);
        }
        calculateRowData(row);
    }

    function recalculateAllRows() {
        document.querySelectorAll("#calTableBody tr").forEach(row => calculateRowData(row));
    }

    function calculateRowData(row) {
        const indVal = parseFloat(row.querySelector(".ind-input").value);
        const stdVal = parseFloat(row.querySelector(".std-input").value);
        const errInput = row.querySelector(".err-input");
        const verdictCell = row.querySelector(".verdict-cell");
        const analysisCell = row.querySelector(".analysis-cell");

        if (isNaN(indVal) || isNaN(stdVal) || stdVal === 0) {
            errInput.value = "N/A";
            verdictCell.textContent = "";
            analysisCell.textContent = "";
            return;
        }

        // Percentage Error Calculation
        const obsError = ((indVal - stdVal) / stdVal) * 100;
        const obsErrorFormatted = (obsError >= 0 ? "+" : "") + obsError.toFixed(2) + "%";
        errInput.value = obsErrorFormatted;

        const status = getSelectedDispenserStatus();
        
        // Department of Weights & Measures MPE statutory limits
        let upperMpe = (status === "New") ? 0.25 : 0.50;
        let lowerMpe = (status === "New") ? -0.125 : -0.25;

        let isPassed = obsError >= lowerMpe && obsError <= upperMpe;
        
        // Compute Factor relative to legal MPE limit
        let factor = 0;
        if (obsError > upperMpe) {
            factor = obsError / upperMpe;
        } else if (obsError < lowerMpe) {
            factor = obsError / lowerMpe;
        }

        if (isPassed) {
            verdictCell.className = "verdict-cell small verdict-pass";
            verdictCell.innerHTML = `PASS (${obsErrorFormatted})<br><span class="text-muted" style="font-size:0.7rem;">Within legal ${status} MPE [${lowerMpe}% to +${upperMpe}%]</span>`;
        } else {
            verdictCell.className = "verdict-cell small verdict-fail";
            verdictCell.innerHTML = `FAIL - Exceeds ${status} limit by factor of ${factor.toFixed(1)}<br><span style="font-size:0.7rem;">(Observed: ${obsErrorFormatted} | Legal MPE: ${lowerMpe}% to +${upperMpe}%)</span>`;
        }

        // Volumetric Financial Analysis
        const diffVol = indVal - stdVal; // Indicated minus Standard
        const absDiffVol = Math.abs(diffVol);
        const mlPerLiter = (absDiffVol / stdVal) * 1000;

        if (Math.abs(diffVol) < 0.001) {
            analysisCell.className = "analysis-cell small text-success";
            analysisCell.textContent = "Zero Volumetric Deviation. Meter calibrated perfectly.";
        } else if (diffVol > 0) {
            // Dispenser shows MORE than actual measure in prover
            analysisCell.className = "analysis-cell small text-danger";
            analysisCell.textContent = `CUSTOMER LOSING / STATION GAINING — Customer pays for ${indVal.toFixed(2)}L but receives ${stdVal.toFixed(2)}L. Meter is over-registering by ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ml/L).`;
        } else {
            // Dispenser shows LESS than actual measure in prover
            analysisCell.className = "analysis-cell small text-warning text-dark";
            analysisCell.textContent = `CUSTOMER GAINING / STATION LOSING — Customer pays for ${indVal.toFixed(2)}L but receives ${stdVal.toFixed(2)}L. Prover indicates dispenser meter is under-registering fuel sold by ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ml/L), so the site is giving away product.`;
        }
    }

    // Signature Canvas Setup
    window.openSignatureModal = (target) => {
        currentSigTarget = target;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        sigModal.show();
    };

    canvas.addEventListener("mousedown", (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener("mousemove", (e) => { if (isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
    canvas.addEventListener("mouseup", () => isDrawing = false);

    document.getElementById("clearSigBtn").addEventListener("click", () => ctx.clearRect(0, 0, canvas.width, canvas.height));
    document.getElementById("saveSigBtn").addEventListener("click", () => {
        const dataUrl = canvas.toDataURL();
        signatures[currentSigTarget] = dataUrl;
        const imgEl = document.getElementById(`${currentSigTarget}SigPreview`);
        imgEl.src = dataUrl;
        imgEl.style.display = "inline-block";
        sigModal.hide();
    });

    // Single-Page PDF Export Logic
    exportPdfBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 8;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header Text
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("FORECOURT WORKS LIMITED", margin, 10);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text("Ramco Court, Gate 3B, Bellevue, Nairobi | Phone: +(254) 729 002 087 | Email: sales@forecourtworks.co.ke", margin, 14);

        // Header Logo
        const logoImg = document.getElementById("companyLogo");
        try {
            doc.addImage(logoImg, 'PNG', pageWidth - margin - 30, 6, 30, 11);
        } catch (e) {
            console.warn("Logo load skipped.");
        }

        doc.setLineWidth(0.4);
        doc.line(margin, 17, pageWidth - margin, 17);

        // Part 1
        const selectedProducts = Array.from(document.querySelectorAll('.prod-check:checked')).map(cb => cb.value).join(", ") || "None";
        const part1Data = [
            ["Client Name", document.getElementById("clientName").value, "Certificate No.", document.getElementById("certNo").value],
            ["Equipment", document.getElementById("equipDesc").value, "Serial Number", document.getElementById("serialNo").value],
            ["Status / Prover", `${getSelectedDispenserStatus()} (${getSelectedProverSize()}L Can)`, "Inspection Date", document.getElementById("inspectDate").value],
            ["Products", selectedProducts, "Location", "Site Forecourt"]
        ];

        doc.autoTable({
            startY: 19,
            body: part1Data,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 2
        const calRows = document.querySelectorAll("#calTableBody tr");
        const part2Data = [];
        calRows.forEach((row, idx) => {
            const verdictText = row.querySelector(".verdict-cell").innerText.replace(/\n/g, " ");
            const analysisText = row.querySelector(".analysis-cell").innerText;
            part2Data.push([
                idx + 1,
                row.querySelector(".ind-input").value,
                row.querySelector(".std-input").value,
                row.querySelector(".err-input").value,
                verdictText,
                analysisText
            ]);
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            head: [["NOZZLE#", "Indicated (L)", "Prover (L)", "Error (%)", "Weights & Measures Verdict", "Volumetric / Financial Analysis"]],
            body: part2Data,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40], fontSize: 7 },
            styles: { fontSize: 6.5, cellPadding: 1 },
            columnStyles: {
                0: { cellWidth: 14 },
                1: { cellWidth: 20 },
                2: { cellWidth: 20 },
                3: { cellWidth: 18 },
                4: { cellWidth: 55 },
                5: { cellWidth: 'auto' }
            },
            margin: { left: margin, right: margin }
        });

        // Part 3 & 4
        const part3_4_Data = [
            ["Amb Temp (°C)", document.getElementById("ambTemp").value, "Prover ID", document.getElementById("proverId").value],
            ["Prod Temp (°C)", document.getElementById("prodTemp").value, "Traceability Cert", document.getElementById("traceCert").value],
            ["Density (kg/m³)", document.getElementById("density").value, "New Seal No.", document.getElementById("newSeal").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part3_4_Data,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 5
        const part5Data = [
            ["Verdict", document.getElementById("finalVerdict").value, "Notes", document.getElementById("techNotes").value],
            ["Inspector", document.getElementById("inspectorName").value, "Client Rep", document.getElementById("clientRep").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part5Data,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        let currentY = doc.lastAutoTable.finalY + 2;

        if (signatures.inspector) {
            doc.addImage(signatures.inspector, 'PNG', margin + 30, currentY, 22, 8);
        }
        if (signatures.client) {
            doc.addImage(signatures.client, 'PNG', pageWidth - margin - 40, currentY, 22, 8);
        }

        // Footer
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bolditalic");
        doc.text("Forecourt Works, Engineering Reliability into every forecourt", pageWidth / 2, 287, { align: "center" });

        doc.save("Forecourt_Works_Calibration_Certificate.pdf");
    });
});
