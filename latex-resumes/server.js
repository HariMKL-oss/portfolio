const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Directories
const BASE_DIR = __dirname;
const CONFIG_FILE = path.join(BASE_DIR, 'config.json');
const DEFAULT_OUTPUT_DIR = path.join(BASE_DIR, 'output');
const TEMP_DIR = path.join(BASE_DIR, 'temp_build');
const PUBLIC_DIR = path.join(BASE_DIR, 'public');

// Ensure essential directories exist
[DEFAULT_OUTPUT_DIR, TEMP_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Load / Save Config
function loadConfig() {
  const defaults = {
    outputDirectory: DEFAULT_OUTPUT_DIR,
    defaultEngine: 'pdflatex',
    autoSave: true,
  };
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaults, ...data };
    } catch (e) {
      console.error('Error reading config file:', e);
    }
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf8');
  return defaults;
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

let currentConfig = loadConfig();

// Serve static frontend files
app.use(express.static(PUBLIC_DIR));

// 1. Get current configuration
app.get('/api/config', (req, res) => {
  currentConfig = loadConfig();
  res.json({
    ...currentConfig,
    defaultOutputDir: DEFAULT_OUTPUT_DIR,
  });
});

// 2. Update configuration (e.g. target download folder)
app.post('/api/config', (req, res) => {
  try {
    const { outputDirectory, defaultEngine, autoSave } = req.body;
    if (outputDirectory) {
      const resolvedDir = path.resolve(outputDirectory.trim());
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }
      currentConfig.outputDirectory = resolvedDir;
    }
    if (defaultEngine) currentConfig.defaultEngine = defaultEngine;
    if (typeof autoSave === 'boolean') currentConfig.autoSave = autoSave;

    saveConfig(currentConfig);
    res.json({ success: true, config: currentConfig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Parse LaTeX log file for line numbers and errors
function parseLatexErrors(logContent) {
  const errors = [];
  const lines = logContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('! ')) {
      const errorMsg = line.substring(2).trim();
      let lineNum = null;
      // Search following lines for l.<number>
      for (let j = i; j < Math.min(i + 8, lines.length); j++) {
        const lMatch = lines[j].match(/^l\.(\d+)/);
        if (lMatch) {
          lineNum = parseInt(lMatch[1], 10);
          break;
        }
      }
      errors.push({
        message: errorMsg,
        line: lineNum,
        raw: lines.slice(i, Math.min(i + 5, lines.length)).join('\n'),
      });
    }
  }
  return errors;
}

// 4. Compile LaTeX code and save to output folder
app.post('/api/compile', async (req, res) => {
  const { code, filename, engine, customFolder } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'No LaTeX code provided' });
  }

  // Sanitize filename
  let docName = (filename || 'Resume').trim().replace(/[\/\\:*?"<>|]/g, '_');
  if (docName.toLowerCase().endsWith('.tex')) {
    docName = docName.substring(0, docName.length - 4);
  }
  if (!docName.toLowerCase().endsWith('.pdf')) {
    docName += '.pdf';
  }

  const compiler = engine || currentConfig.defaultEngine || 'pdflatex';
  const targetDir = customFolder ? path.resolve(customFolder) : currentConfig.outputDirectory;

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      return res.status(500).json({ success: false, error: `Could not create target directory: ${targetDir}` });
    }
  }

  const buildId = `build_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const buildDir = path.join(TEMP_DIR, buildId);
  fs.mkdirSync(buildDir, { recursive: true });

  const texFile = path.join(buildDir, 'main.tex');
  fs.writeFileSync(texFile, code, 'utf8');

  // Run compiler twice for references/page counts if needed
  const runLatex = () => {
    return new Promise((resolve) => {
      const cmdArgs = ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'];
      const child = spawn(compiler, cmdArgs, {
        cwd: buildDir,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => (stdout += d.toString()));
      child.stderr.on('data', (d) => (stderr += d.toString()));

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', (err) => {
        resolve({ code: -1, stdout, stderr: err.message });
      });
    });
  };

  try {
    const result = await runLatex();
    const logFile = path.join(buildDir, 'main.log');
    let logContent = result.stdout || '';
    if (fs.existsSync(logFile)) {
      logContent = fs.readFileSync(logFile, 'utf8');
    }

    const pdfSource = path.join(buildDir, 'main.pdf');
    const destinationPdf = path.join(targetDir, docName);

    if (result.code === 0 && fs.existsSync(pdfSource)) {
      // Copy to output folder directly!
      fs.copyFileSync(pdfSource, destinationPdf);

      // Clean up temp build folder after short delay
      setTimeout(() => {
        try {
          fs.rmSync(buildDir, { recursive: true, force: true });
        } catch (_) {}
      }, 5000);

      return res.json({
        success: true,
        filename: docName,
        savedTo: destinationPdf,
        targetFolder: targetDir,
        logs: logContent,
        previewUrl: `/api/pdf/${encodeURIComponent(docName)}?t=${Date.now()}`,
      });
    } else {
      const errors = parseLatexErrors(logContent);
      return res.json({
        success: false,
        errors,
        logs: logContent,
        stderr: result.stderr,
        message: 'Compilation failed. Check error logs.',
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Explicitly Save / Download to any specified local folder
app.post('/api/save-to-folder', (req, res) => {
  try {
    const { filename, targetFolder } = req.body;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    const destFolder = targetFolder ? path.resolve(targetFolder) : currentConfig.outputDirectory;
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    const sourceFile = path.join(currentConfig.outputDirectory, filename);
    const destFile = path.join(destFolder, filename);

    if (!fs.existsSync(sourceFile)) {
      return res.status(404).json({ error: `Source file ${filename} not found in output directory.` });
    }

    if (sourceFile !== destFile) {
      fs.copyFileSync(sourceFile, destFile);
    }

    res.json({
      success: true,
      message: `Saved successfully to ${destFile}`,
      savedPath: destFile,
      folder: destFolder,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Open Target Folder in Windows File Explorer
app.post('/api/open-folder', (req, res) => {
  try {
    const folder = req.body.folder ? path.resolve(req.body.folder) : currentConfig.outputDirectory;
    const filename = req.body.filename;

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    let targetPath = folder;
    let args = [folder];

    if (filename) {
      const targetFile = path.join(folder, filename);
      if (fs.existsSync(targetFile)) {
        targetPath = targetFile;
        args = [`/select,${targetFile}`];
      }
    }

    const child = spawn('explorer.exe', args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();

    res.json({ success: true, folderOpened: folder, targetPath });
  } catch (err) {
    console.error('Explorer error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Open PDF directly in Windows default PDF reader
app.post('/api/open-file', (req, res) => {
  try {
    const { filename } = req.body;
    const folder = currentConfig.outputDirectory;
    const filePath = path.join(folder, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk.' });
    }

    const child = spawn('cmd.exe', ['/c', 'start', '""', filePath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();

    res.json({ success: true, opened: filePath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. List all generated PDFs in the download/output folder
app.get('/api/documents', (req, res) => {
  try {
    const targetDir = currentConfig.outputDirectory;
    if (!fs.existsSync(targetDir)) {
      return res.json({ documents: [], folder: targetDir });
    }

    const files = fs.readdirSync(targetDir)
      .filter((f) => f.toLowerCase().endsWith('.pdf'))
      .map((name) => {
        const fullPath = path.join(targetDir, name);
        const stats = fs.statSync(fullPath);
        return {
          name,
          fullPath,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          modifiedAt: stats.mtime,
          previewUrl: `/api/pdf/${encodeURIComponent(name)}?t=${stats.mtimeMs}`,
        };
      })
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    res.json({ documents: files, folder: targetDir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Serve PDF stream for in-browser live preview
app.get('/api/pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(currentConfig.outputDirectory, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('PDF not found');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// 10. Direct browser download route
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(currentConfig.outputDirectory, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('PDF not found');
  }

  res.download(filePath, filename);
});

// 11. Delete document
app.delete('/api/documents/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(currentConfig.outputDirectory, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to get local network IP
function getNetworkIp() {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.29.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const networkIp = getNetworkIp();
  console.log(`====================================================`);
  console.log(`🚀 LaTeX Resume Studio is running!`);
  console.log(`🔗 Local URL:        http://localhost:${PORT}`);
  console.log(`🌐 Wi-Fi / LAN URL:  http://${networkIp}:${PORT} (Share with friends on same Wi-Fi)`);
  console.log(`📂 Output Directory: ${currentConfig.outputDirectory}`);
  console.log(`⚙️ Default Compiler: ${currentConfig.defaultEngine}`);
  console.log(`====================================================`);
});
