// Base64 string snippet for Century Gothic Regular (replace with your full TTF/OTF base64 font string)
const centuryGothicBase64 = "AAEAAAASAQACAAAAR0ZCR..." ; // Insert full font Base64 string here

exportPdfBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const margin = 8;
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Register Century Gothic font into jsPDF virtual file system
    doc.addFileToVFS('CenturyGothic.ttf', centuryGothicBase64);
    doc.addFont('CenturyGothic.ttf', 'CenturyGothic', 'normal');
    
    // 2. Set Century Gothic as the active document font
    doc.setFont('CenturyGothic', 'normal');

    // Header Text
    doc.setFontSize(10);
    doc.text("FORECOURT WORKS LIMITED", margin, 10);
    doc.setFontSize(7.5);
    doc.text("Ramco Court, Gate 3B, Bellevue, Nairobi | Phone: +(254) 729 002 087 | Email: sales@forecourtworks.co.ke", margin, 14);

    // Force logo rendering via off-screen Canvas
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
            console.error("Logo render failed:", e);
        }
    }

    doc.setLineWidth(0.4);
    doc.line(margin, 17, pageWidth - margin, 17);

    // 3. Apply Century Gothic to AutoTable Plugin
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
        styles: { font: 'CenturyGothic', fontSize: 7, cellPadding: 1 },
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
        headStyles: { fillColor: [40, 40, 40], fontSize: 7, font: 'CenturyGothic' },
        styles: { font: 'CenturyGothic', fontSize: 6.5, cellPadding: 1 },
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

    doc.setFontSize(7.5);
    doc.text("Forecourt Works, Engineering Reliability into every forecourt", pageWidth / 2, 287, { align: "center" });

    doc.save("Forecourt_Works_Calibration_Certificate.pdf");
});
