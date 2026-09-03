document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("calTableBody");
    const addRowBtn = document.getElementById("addRowBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    const avgErrorCell = document.getElementById("avgErrorCell");

    let currentSigTarget = null;
    let signatures = { inspector: null, client: null };

    // Canvas Setup
    const sigModal = new bootstrap.Modal(document.getElementById("signatureModal"));
    const canvas = document.getElementById("sigCanvas");
    const ctx = canvas.getContext("2d");
    let isDrawing = false;

    // Initialize 3 default Nozzle rows
    for (let i = 1; i <= 3; i++) addRow(i);

    addRowBtn.addEventListener("click", () => addRow(tableBody.children.length + 1));

    function addRow(nozzleNumber) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center fw-bold">${nozzleNumber}</td>
            <td><input type="text" class="table-input std-input" placeholder="20.00" value="20.00"></td>
            <td><input type="text" class="table-input ind-input" placeholder="0.00"></td>
            <td><input type="text" class="table-input err-input" readonly placeholder="0.00%"></td>
            <td><input type="text" class="table-input remark-input" placeholder="Pass / Fail"></td>
        `;
        tableBody.appendChild(tr);
        attachRowEvents(tr);
    }

    function attachRowEvents(row) {
        const stdInput = row.querySelector(".std-input");
        const indInput = row.querySelector(".ind-input");
        
        [stdInput, indInput].forEach(input => {
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
        calculateRowError(row);
        calculateOverallAverage();
    }

    function calculateRowError(row) {
        const stdVal = parseFloat(row.querySelector(".std-input").value);
        const indVal = parseFloat(row.querySelector(".ind-input").value);
        const errInput = row.querySelector(".err-input");

        if (!isNaN(stdVal) && !isNaN(indVal) && stdVal !== 0) {
            const errorPercent = ((indVal - stdVal) / stdVal) * 100;
            errInput.value = errorPercent.toFixed(2) + "%";
        } else {
            errInput.value = "N/A";
        }
    }

    function calculateOverallAverage() {
        const errInputs = document.querySelectorAll(".err-input");
        let totalError = 0, validCount = 0;

        errInputs.forEach(input => {
            const val = parseFloat(input.value.replace("%", ""));
            if (!isNaN(val)) {
                totalError += val;
                validCount++;
            }
        });

        avgErrorCell.textContent = validCount > 0 ? (totalError / validCount).toFixed(2) + "%" : "0.00%";
    }

    // Signature Canvas Logic
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

    // 1-PAGE PDF Export Logic
    exportPdfBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 10;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header Top Left Details
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("FORECOURT WORKS LIMITED", margin, 12);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Ramco Court, Gate 3B, Bellevue, Nairobi", margin, 16);
        doc.text("Phone: +(254) 729 002 087 | Email: sales@forecourtworks.co.ke", margin, 20);

        // Header Top Right Logo
        const logoImg = document.getElementById("companyLogo");
        try {
            doc.addImage(logoImg, 'PNG', pageWidth - margin - 35, 8, 35, 14);
        } catch (e) {
            console.warn("Logo skipped or failed to load into PDF.");
        }

        doc.setLineWidth(0.5);
        doc.line(margin, 24, pageWidth - margin, 24);

        // Part 1: Selected Products
        const selectedProducts = Array.from(document.querySelectorAll('.prod-check:checked')).map(cb => cb.value).join(", ") || "None";
        const part1Data = [
            ["Client Name", document.getElementById("clientName").value, "Certificate No.", document.getElementById("certNo").value],
            ["Equipment", document.getElementById("equipDesc").value, "Serial Number", document.getElementById("serialNo").value],
            ["Inspection Date", document.getElementById("inspectDate").value, "Location", document.getElementById("location").value],
            ["Manufacturer", document.getElementById("makeModel").value, "Product Type", selectedProducts]
        ];

        doc.autoTable({
            startY: 26,
            body: part1Data,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.2 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 2: Calibration Table
        const calRows = document.querySelectorAll("#calTableBody tr");
        const part2Data = [];
        calRows.forEach((row, idx) => {
            part2Data.push([
                idx + 1,
                row.querySelector(".std-input").value,
                row.querySelector(".ind-input").value,
                row.querySelector(".err-input").value,
                row.querySelector(".remark-input").value
            ]);
        });
        part2Data.push([{ content: "Average Error", colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, avgErrorCell.textContent, ""]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 4,
            head: [["NOZZLE#", "Standard (L)", "Indicated (L)", "Error (%)", "Remarks"]],
            body: part2Data,
            theme: 'striped',
            headStyles: { fillColor: [50, 50, 50], fontSize: 7.5 },
            styles: { fontSize: 7.5, cellPadding: 1.2 },
            margin: { left: margin, right: margin }
        });

        // Part 3 & 4 (Combined Row)
        const part3_4_Data = [
            ["Amb Temp (°C)", document.getElementById("ambTemp").value, "Prover ID", document.getElementById("proverId").value],
            ["Prod Temp (°C)", document.getElementById("prodTemp").value, "Traceability Cert", document.getElementById("traceCert").value],
            ["Density (kg/m³)", document.getElementById("density").value, "New Seal No.", document.getElementById("newSeal").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 4,
            body: part3_4_Data,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.2 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        // Part 5: Verdict & Sign-Offs
        const part5Data = [
            ["Verdict", document.getElementById("finalVerdict").value, "Notes", document.getElementById("techNotes").value],
            ["Inspector Name", document.getElementById("inspectorName").value, "Client Rep Name", document.getElementById("clientRep").value]
        ];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 4,
            body: part5Data,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245] }, 2: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
            margin: { left: margin, right: margin }
        });

        let currentY = doc.lastAutoTable.finalY + 4;

        // Render Digital Signatures onto PDF
        if (signatures.inspector) {
            doc.addImage(signatures.inspector, 'PNG', margin + 30, currentY, 25, 10);
        }
        if (signatures.client) {
            doc.addImage(signatures.client, 'PNG', pageWidth - margin - 45, currentY, 25, 10);
        }

        // Footer Note Centered
        doc.setFontSize(8);
        doc.setFont("helvetica", "bolditalic");
        doc.text("Forecourt Works, Engineering Reliability into every forecourt", pageWidth / 2, 285, { align: "center" });

        doc.save("Forecourt_Works_Calibration_Certificate.pdf");
    });
});
