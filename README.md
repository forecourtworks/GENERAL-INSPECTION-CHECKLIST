# Equipment Calibration & Inspection Portal

A lightweight web application designed to capture field inspection, asset calibration parameters, and measurement verification data. Generates formatted PDF export reports directly from the browser.

## Key Features
* **Structured Tables:** Part 1 (General Information) and Part 2 (Calibration Measurements) organized in responsive, structured grid layouts.
* **Flexible Input Engine:** Supports numeric entries alongside plain text entries in measurement fields without breaking execution loops.
* **Auto-Formatting:** Automatically formats pure numeric inputs to two decimal places (`0.00`) upon field completion.
* **Rectified Calculations:** Corrected percentage error formula `((Indicated - Standard) / Standard) * 100` and overall dynamic mean calculation.
* **PDF Export:** Integrated client-side export generating structured tables with auto-calculated values.

## Usage
1. Open `index.html` in any modern web browser.
2. Fill out Part 1 (Client, Certificate, and Asset Details).
3. Record measurements in Part 2. Input values auto-format to 2 decimal places (`0.00`). Text values (e.g., "N/A", "Blocked") are safely retained.
4. Click **Export PDF** to produce the final PDF inspection report.
