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

    // --- 1. CAPS LOCK & INPUT ENFORCEMENT ---
    document.addEventListener("input", (e) => {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") && e.target.type !== "radio" && e.target.type !== "checkbox" && e.target.type !== "date") {
            e.target.value = e.target.value.toUpperCase();
        }
    });

    // --- 2. HELPERS & CALIBRATION TABLE LOGIC ---
    function getSelectedProverSize() {
        const checked = document.querySelector('.prover-radio:checked');
        return checked ? parseFloat(checked.value) : 20.0;
    }

    function getSelectedDispenserStatus() {
        const checked = document.querySelector('.status-radio:checked');
        return checked ? checked.value.toUpperCase() : "NEW";
    }

    // Initialize default rows
    for (let i = 1; i <= 3; i++) {
        addRow(i);
    }

    if (addRowBtn) {
        addRowBtn.addEventListener("click", () => {
            const currentRows = tableBody.children.length;
            addRow(currentRows + 1);
        });
    }

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
            <td><input type="text" class="table-input ind-input caps-input" placeholder="${proverVol.toFixed(2)}" value="${proverVol.toFixed(2)}"></td>
            <td><input type="text" class="table-input std-input caps-input" placeholder="${proverVol.toFixed(2)}" value="${proverVol.toFixed(2)}"></td>
            <td><input type="text" class="table-input err-input" readonly placeholder="0.00%"></td>
            <td class="verdict-cell small"></td>
            <td class="analysis-cell small"></td>
        `;
        tableBody.appendChild(tr);
        attachRowEvents(tr);
        calculateRowData(tr);
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
        let upperMpe = (status === "NEW") ? 0.25 : 0.50;
        let lowerMpe = (status === "NEW") ? -0.125 : -0.25;

        let isPassed = obsError >= lowerMpe && obsError <= upperMpe;
        
        let factor = 0;
        if (obsError > upperMpe) {
            factor = obsError / upperMpe;
        } else if (obsError < lowerMpe) {
            factor = obsError / lowerMpe;
        }

        if (isPassed) {
            verdictCell.className = "verdict-cell small verdict-pass";
            verdictCell.innerHTML = `PASS (${obsErrorFormatted})<br><span class="text-muted" style="font-size:0.7rem;">WITHIN LEGAL ${status} MPE [${lowerMpe}% TO +${upperMpe}%]</span>`;
        } else {
            verdictCell.className = "verdict-cell small verdict-fail";
            verdictCell.innerHTML = `FAIL - EXCEEDS ${status} LIMIT BY FACTOR OF ${factor.toFixed(1)}<br><span style="font-size:0.7rem;">(OBSERVED: ${obsErrorFormatted} | LEGAL MPE: ${lowerMpe}% TO +${upperMpe}%)</span>`;
        }

        const diffVol = indVal - stdVal;
        const absDiffVol = Math.abs(diffVol);
        const mlPerLiter = (absDiffVol / stdVal) * 1000;

        if (isPassed) {
            analysisCell.className = "analysis-cell small text-success";
            if (Math.abs(diffVol) < 0.001) {
                analysisCell.innerHTML = "<strong>PASS</strong> — ZERO VOLUMETRIC DEVIATION. METER CALIBRATED PERFECTLY.";
            } else if (diffVol > 0) {
                analysisCell.innerHTML = `<strong>PASS</strong> — MINOR OVER-REGISTRATION (+${absDiffVol.toFixed(2)}L, ${mlPerLiter.toFixed(1)} ML/L), WITHIN ALLOWABLE LEGAL TOLERANCE LIMITS.`;
            } else {
                analysisCell.innerHTML = `<strong>PASS</strong> — MINOR UNDER-REGISTRATION (-${absDiffVol.toFixed(2)}L, ${mlPerLiter.toFixed(1)} ML/L), WITHIN ALLOWABLE LEGAL TOLERANCE LIMITS.`;
            }
        } else {
            analysisCell.className = "analysis-cell small text-danger";
            if (diffVol > 0) {
                analysisCell.innerHTML = `FAIL — <strong>CUSTOMER LOSING / STATION GAINING</strong>. OVER-REGISTERING BEYOND ALLOWABLE TOLERANCE BY ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ML/L). IMMEDIATE ADJUSTMENT REQUIRED.`;
            } else {
                analysisCell.innerHTML = `FAIL — <strong>CUSTOMER GAINING / STATION LOSING</strong>. UNDER-REGISTERING BEYOND ALLOWABLE TOLERANCE BY ${absDiffVol.toFixed(2)}L (${mlPerLiter.toFixed(1)} ML/L). SITE IS GIVING AWAY PRODUCT.`;
            }
        }
    }

    // --- 3. TOUCH & MOUSE SIGNATURE CAPTURE (BLACK INK) ---
    function setupCanvasStyle() {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        setupCanvasStyle();
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDrawing(e) {
        if (isDrawing) {
            e.preventDefault();
            isDrawing = false;
        }
    }

    // Mouse Listeners
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Touch & Stylus Listeners
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing, { passive: false });

    window.openSignatureModal = (target) => {
        currentSigTarget = target;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setupCanvasStyle();
        sigModal.show();
    };

    document.getElementById("clearSigBtn").addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setupCanvasStyle();
    });

    document.getElementById("saveSigBtn").addEventListener("click", () => {
        const dataUrl = canvas.toDataURL("image/png");
        signatures[currentSigTarget] = dataUrl;
        const imgEl = document.getElementById(`${currentSigTarget}SigPreview`);
        imgEl.src = dataUrl;
        imgEl.style.display = "inline-block";
        sigModal.hide();
    });

    // --- 4. LOGO FETCHING & PDF GENERATION ---
    async function getLogoBase64() {
        const logoUrl = "https://raw.githubusercontent.com/forecourtworks/FORECOURT-SWL-PNG-LOGO-/main/FSW-SWL%20png.png";
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function () {
                const canvasImg = document.createElement("canvas");
                canvasImg.width = this.naturalWidth || 300;
                canvasImg.height = this.naturalHeight || 60;
                const ctxImg = canvasImg.getContext("2d");
                ctxImg.drawImage(this, 0, 0);
                resolve(canvasImg.toDataURL("image/png"));
            };
            img.onerror = function () {
                console.error("Logo failed to load from GitHub repository.");
                resolve(null);
            };
            img.src = logoUrl;
        });
    }

    exportPdfBtn.addEventListener("click", async () => {
        // Enforce Mandatory Signatures
        if (!signatures.inspector) {
            alert("INSPECTOR SIGNATURE IS MANDATORY BEFORE GENERATING PDF.");
            openSignatureModal('inspector');
            return;
        }
        if (!signatures.client) {
            alert("CLIENT REPRESENTATIVE SIGNATURE IS MANDATORY BEFORE GENERATING PDF.");
            openSignatureModal('client');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 8;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("FORECOURT WORKS LIMITED", margin, 10);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text("RAMCO COURT, GATE 3B, BELLEVUE, NAIROBI | PHONE: +(254) 729 002 087 | EMAIL: SALES@FORECOURTWORKS.CO.KE", margin, 14);

        // Embed Logo
        const logoDataUrl = await getLogoBase64();
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 50, 5, 50, 9);
            } catch (e) {
                console.error("PDF logo embedding failed:", e);
            }
        }

        doc.setLineWidth(0.4);
        doc.line(margin, 17, pageWidth - margin, 17);

        // Part 1 Data
        const selectedProducts = Array.from(document.querySelectorAll('.prod-check:checked')).map(cb => cb.value).join(", ") || "NONE";
        const part1Data = [
            ["CLIENT NAME", document.getElementById("clientName").value, "CERTIFICATE NO.", document.getElementById("certNo").value],
            ["SITE / LOCATION", document.getElementById("siteLocation").value, "ASSOCIATED WO#", document.getElementById("associatedWo").value],
            ["EQUIPMENT", document.getElementById("equipDesc").value, "EQUIPMENT ID", document.getElementById("equipId").value],
            ["SERIAL NUMBER", document.getElementById("serialNo").value, "PROVER CAN SIZE", `${getSelectedProverSize()}L CAN`],
            ["DISPENSER STATUS", getSelectedDispenserStatus(), "INSPECTION DATE", document.getElementById("inspectDate").value],
            ["PRODUCTS", selectedProducts, "LOCATION", "SITE FORECOURT"]
        ];

        doc.autoTable({
            startY: 19,
            body: part1Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 6.8, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 2 Data
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
            head: [["NOZZLE#", "INDICATED (L)", "PROVER (L)", "ERROR (%)", "WEIGHTS & MEASURES VERDICT", "VOLUMETRIC / FINANCIAL ANALYSIS"]],
            body: part2Data,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40], fontSize: 6.8, fontStyle: 'bold' },
            styles: { font: "helvetica", fontSize: 6.2, cellPadding: 1 },
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

        // Part 3 & 4 Data
        const part3_4_Data = [
            ["AMB TEMP (°C)", document.getElementById("ambTemp").value, "PROVER ID", document.getElementById("proverId").value],
            ["PROD TEMP (°C)", document.getElementById("prodTemp").value, "TRACEABILITY CERT", document.getElementById("traceCert").value],
            ["DENSITY (KG/M³)", document.getElementById("density").value, "NEW SEAL NO.", document.getElementById("newSeal").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part3_4_Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 6.8, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 5 Data
        const part5Data = [
            ["VERDICT", document.getElementById("finalVerdict").value, "NOTES", document.getElementById("techNotes").value],
            ["INSPECTOR", document.getElementById("inspectorName").value, "CLIENT REP", document.getElementById("clientRep").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 3,
            body: part5Data,
            theme: 'grid',
            styles: { font: "helvetica", fontSize: 6.8, cellPadding: 1 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        let currentY = doc.lastAutoTable.finalY + 2;

        // Render Signatures
        doc.addImage(signatures.inspector, 'PNG', margin + 30, currentY, 22, 8);
        doc.addImage(signatures.client, 'PNG', pageWidth - margin - 40, currentY, 22, 8);

        // PDF Footer Line & Text
        doc.setLineWidth(0.3);
        doc.line(margin, 283, pageWidth - margin, 283);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bolditalic");
        doc.text("FORECOURT WORKS, ENGINEERING RELIABILITY INTO EVERY FORECOURT", pageWidth / 2, 287, { align: "center" });

        doc.save("FORECOURT_WORKS_CALIBRATION_CERTIFICATE.pdf");
    });
});
