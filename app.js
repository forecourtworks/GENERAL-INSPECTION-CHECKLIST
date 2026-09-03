document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("calTableBody");
    const addRowBtn = document.getElementById("addRowBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    const avgErrorCell = document.getElementById("avgErrorCell");

    // Initialize with 3 standard measurement rows
    for (let i = 1; i <= 3; i++) {
        addRow(i);
    }

    addRowBtn.addEventListener("click", () => {
        const rowCount = tableBody.children.length + 1;
        addRow(rowCount);
    });

    function addRow(runNumber) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="text-center font-weight-bold">${runNumber}</td>
            <td><input type="text" class="table-input std-input" placeholder="20.00" value="20.00"></td>
            <td><input type="text" class="table-input ind-input" placeholder="0.00"></td>
            <td><input type="text" class="table-input err-input" readonly placeholder="0.00%"></td>
            <td><input type="text" class="table-input remark-input" placeholder="Pass / Fail / Text"></td>
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
        
        // Format to 2 decimal places if entry is purely numeric
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

        // Rectified Formula Logic: Percentage Error = ((Indicated - Standard) / Standard) * 100
        if (!isNaN(stdVal) && !isNaN(indVal) && stdVal !== 0) {
            const errorPercent = ((indVal - stdVal) / stdVal) * 100;
            errInput.value = errorPercent.toFixed(2) + "%";
        } else {
            errInput.value = "N/A";
        }
    }

    function calculateOverallAverage() {
        const errInputs = document.querySelectorAll(".err-input");
        let totalError = 0;
        let validCount = 0;

        errInputs.forEach(input => {
            const val = parseFloat(input.value.replace("%", ""));
            if (!isNaN(val)) {
                totalError += val;
                validCount++;
            }
        });

        if (validCount > 0) {
            const avg = totalError / validCount;
            avgErrorCell.textContent = avg.toFixed(2) + "%";
        } else {
            avgErrorCell.textContent = "0.00%";
        }
    }

    // PDF Generation Logic
    exportPdfBtn.addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header Title
        doc.setFontSize(16);
        doc.text("Equipment Calibration & Inspection Report", 14, 15);

        // Part 1: Table Export
        doc.setFontSize(12);
        doc.text("Part 1: General Information", 14, 25);
        
        const part1Data = [
            ["Client Name", document.getElementById("clientName").value, "Certificate No.", document.getElementById("certNo").value],
            ["Equipment Desc.", document.getElementById("equipDesc").value, "Serial Number", document.getElementById("serialNo").value],
            ["Inspection Date", document.getElementById("inspectDate").value, "Location", document.getElementById("location").value]
        ];

        doc.autoTable({
            startY: 28,
            body: part1Data,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 }
        });

        // Part 2: Calibration Table Export
        const currentY = doc.lastAutoTable.finalY + 10;
        doc.text("Part 2: Calibration Measurements", 14, currentY);

        const rows = document.querySelectorAll("#calTableBody tr");
        const part2Data = [];

        rows.forEach((row, idx) => {
            const std = row.querySelector(".std-input").value;
            const ind = row.querySelector(".ind-input").value;
            const err = row.querySelector(".err-input").value;
            const rem = row.querySelector(".remark-input").value;
            part2Data.push([idx + 1, std, ind, err, rem]);
        });

        part2Data.push(["Average Error", "", "", avgErrorCell.textContent, ""]);

        doc.autoTable({
            startY: currentY + 3,
            head: [["Run #", "Standard Measure (L)", "Indicated Display (L)", "Error (%)", "Remarks"]],
            body: part2Data,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 2 }
        });

        doc.save("Calibration_Report.pdf");
    });
});
