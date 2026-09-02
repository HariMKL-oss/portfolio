# 📄 LaTeX Resume Studio

A local, lightweight, and fast **Overleaf-style LaTeX code runner and resume manager**. 

### 🚀 Key Features:
- **Instant LaTeX Compilation**: Compiles your `.tex` code in real-time using `pdflatex` or `xelatex`.
- **Side-by-Side PDF Live Preview**: View changes immediately next to your code.
- **Direct-to-Folder Downloading & Saving**: Whenever you click **Run & Save** or **Download to Folder**, the PDF is instantly written directly to your chosen local folder (e.g. `d:\P Project\Portfolio\latex-resumes\output` or any custom Windows directory).
- **One-Click Explorer Access**: Click **Open Folder** to reveal the newly compiled PDF highlighted in Windows File Explorer.
- **Built-in Resume Templates**:
  - *Jake's Resume* (Gold-standard ATS friendly single-page software engineer template).
  - *Modern Developer CV* (Clean color-accented format).
  - *Minimal Clean CV* (Classic minimalist layout).
- **Error Diagnostics**: Highlights exact line numbers and logs if compilation syntax fails.
- **Saved Resumes History**: Browse, preview, open in system PDF reader, or delete past generated resumes.

---

### 💻 How to Run:
1. Double-click **`launch-latex-studio.bat`** in the portfolio root folder, or **`latex-resumes/start.bat`**.
2. Alternatively, open a terminal in `latex-resumes/` and run:
   ```bash
   npm start
   ```
3. Open `http://localhost:5050` in your browser.
