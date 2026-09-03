# Forecourt Works - Field Service Inspection & Metrology App

A lightweight, web-based field inspection and metrology report generator designed for fuel dispensing units (FDUs), lifting assets, and forecourt infrastructure.

## Key Features
* **Multi-Step Audit Workflow:** Dynamic step navigation with persistent state handling across form steps.
* **Legal Metrology Metrology Module:** Calculates dispenser meter errors in absolute volume (ml) and percentage (%) in accordance with Kenya Weights & Measures standards.
* **JSHA Risk Matrix:** 3-column Job Safety and Hazard Analysis table with automatic green/red status highlighting.
* **15% Opacity Table Layouts:** Professional high-legibility tables with subtle 15% opacity grid borders.
* **Dynamic Page Budgeting:** Engine automatically tracks vertical page height (`cursorY`) in jsPDF to prevent header orphan errors or text clipping across page breaks.
* **Responsive Signature Pad:** HTML5 canvas signature capture for lead technicians and client representatives.

## File Structure
* `index.html` — Application DOM structure, form step cards, inputs, and modal wrappers.
* `app.js` — State management, metrology calculations, JSHA dynamic rendering, and jsPDF engine.
* `README.md` — Technical documentation and deployment guidelines.

## Quick Start
1. Clone or download the repository into your web server directory.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari). No backend server build required.
3. Complete the multi-step inspection form and click **Generate Professional PDF Report**.
