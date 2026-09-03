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

    function getSelectedProverSize() {
        const checked = document.querySelector('.prover-radio:checked');
        return checked ? parseFloat(checked.value) : 20.0;
    }

    function getSelectedDispenserStatus() {
        const checked = document.querySelector('.status-radio:checked');
        return checked ? checked.value : "New";
    }

    for (let i = 1; i <= 3; i++) addRow(i);

    addRowBtn.addEventListener("click", () => addRow(tableBody.children.length + 1));

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

        const obsError = ((indVal - stdVal) / stdVal) * 100;
        const obsErrorFormatted = (obsError >= 0 ? "+" : "") + obsError.toFixed(2) + "%";
        errInput.value = obsErrorFormatted;

        const status = getSelectedDispenserStatus();
        let upperMpe = (status === "New") ? 0.25 : 0.50;
        let lowerMpe = (status === "New") ? -0.125 : -0.25;

        let isPassed = obsError >= lowerMpe && obsError <= upperMpe;
        
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

        const diffVol = indVal - stdVal;
        const absDiffVol = Math.abs(diffVol);
        const mlPerLiter = (absDiffVol / stdVal) * 1000;

        // Corrected logic: evaluate tolerance before issuing warnings/fails
        if (isPassed) {
            analysisCell.className = "analysis-cell small text-success";
            if (Math.abs(diffVol) < 0.001) {
                analysisCell.textContent = "PASS — Zero Volumetric Deviation. Meter calibrated perfectly.";
            } else if (diffVol > 0) {
                analysisCell.textContent = `PASS — Minor over-registration (+${absDiffVol.toFixed(2)}L, ${mlPerLiter.toFixed(1)} ml/L), within allowable legal tolerance limits.`;
            } else {
                analysisCell.textContent = `PASS — Minor under-registration (-${absDiffVol.toFixed(2)}L, ${mlPerLiter.toFixed(1)} ml/L), within allowable legal tolerance limits.`;
            }
        } else {
            analysisCell.className = "analysis-cell small text-danger";
            if (diffVol > 0) {
                analysisCell.textContent = `FAIL — CUSTOMER LOSING / STATION GAINING. Over-registering beyond allowable tolerance by ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ml/L). Immediate adjustment required.`;
            } else {
                analysisCell.textContent = `FAIL — CUSTOMER GAINING / STATION LOSING. Under-registering beyond allowable tolerance by ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ml/L). Site is giving away product.`;
            }
        }
    }

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

    exportPdfBtn.addEventListener("click", async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 8;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Configure Century Gothic system font fallback across jsPDF
        doc.setFont("helvetica", "bold");

        doc.setFontSize(10);
        doc.text("FORECOURT WORKS LIMITED", margin, 10);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text("Ramco Court, Gate 3B, Bellevue, Nairobi | Phone: +(254) 729 002 087 | Email: sales@forecourtworks.co.ke", margin, 14);

        // Force logo rendering via off-screen Canvas draw to bypass image-loading latency
        const logoImg = document.getElementById("companyLogo");
        let logoDataUrl = "";

        try {
            const canvasImg = document.createElement("canvas");
            canvasImg.width = logoImg.naturalWidth || 300;
            canvasImg.height = logoImg.naturalHeight || 60;
            const ctxImg = canvasImg.getContext("2d");
            ctxImg.drawImage(logoImg, 0, 0);
            logoDataUrl = canvasImg.toDataURL("image/png");
        } catch (err) {
            logoDataUrl = logoImg.src;
        }

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 50, 5, 50, 9);
            } catch (e) {
                console.error("Logo force-render failed: ", e);
            }
        }

        doc.setLineWidth(0.4);
        doc.line(margin, 17, pageWidth - margin, 17);

        const selectedProducts = Array.from(document.querySelectorAll('.prod-check:checked')).map(cb => cb.value).join(", ") || "None";
        const part1Data = [
            ["Client Name", document.getElementById("clientName").value, "Certificate No.", document.getElementById("certNo").value],
            ["Equipment", document.getElementById("equipDesc").value, "Equipment ID", document.getElementById("equipId").value],
            ["Serial Number", document.getElementById("serialNo").value, "Prover Can Size", `${getSelectedProverSize()}L Can`],
            ["Dispenser Status", getSelectedDispenserStatus(), "Inspection Date", document.getElementById("inspectDate").value],
            ["Products", selectedProducts, "Location", "Site Forecourt"]
        ];

        doc.autoTable({
            startY: 19,
            body: part1Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

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
            headStyles: { fillColor: [40, 40, 40], fontSize: 7, fontStyle: 'bold' },
            styles: { font: "helvetica", fontSize: 6.5, cellPadding: 1 },
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

        const part3_4_Data = [
            ["Amb Temp (°C)", document.getElementById("ambTemp").value, "Prover ID", document.getElementById("proverId").value],
            ["Prod Temp (°C)", document.getElementById("prodTemp").value, "Traceability Cert", document.getElementById("traceCert").value],
            ["Density (kg/m³)", document.getElementById("density").value, "New Seal No.", document.getElementById("newSeal").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part3_4_Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 7, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        const part5Data = [
            ["Verdict", document.getElementById("finalVerdict").value, "Notes", document.getElementById("techNotes").value],
            ["Inspector", document.getElementById("inspectorName").value, "Client Rep", document.getElementById("clientRep").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part5Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 7, cellPadding: 1 },
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

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bolditalic");
        doc.text("Forecourt Works, Engineering Reliability into every forecourt", pageWidth / 2, 287, { align: "center" });

        doc.save("Forecourt_Works_Calibration_Certificate.pdf");
    });
});
