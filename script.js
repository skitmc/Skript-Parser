/**
 * SKRIPT-PARSER | SKITMC Community Project
 * Core Engine: Monaco Editor Integration & Syntax Linter
 */

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function() {
    
    // 1. REGISTER CUSTOM SKRIPT SYNTX
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/on (join|quit|death|break|place|chat|rightclick|leftclick|load):?/, 'keyword'],
                [/command \/\w+:?/, 'keyword'],
                [/trigger:?/, 'keyword'],
                [/options:?/, 'keyword'],
                [/if |else |loop |while |return |stop/, 'keyword'],
                [/set |add |remove |give |send |broadcast |cancel event/, 'operator'],
                [/({[^}]+})/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment']
            ]
        }
    });

    // 2. DEFINE PROFESSIONAL THEME (Midnight Cobalt)
    monaco.editor.defineTheme('sk-repo-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '58a6ff', fontStyle: 'bold' },
            { token: 'operator', foreground: '79c0ff' },
            { token: 'variable', foreground: 'ffa657' },
            { token: 'comment', foreground: '8b949e', fontStyle: 'italic' }
        ],
        colors: {
            'editor.background': '#0d1117',
            'editor.lineHighlightBackground': '#161b22',
            'editorCursor.foreground': '#58a6ff',
            'editorIndentGuide.activeBackground': '#30363d'
        }
    });

    // 3. INITIALIZE EDITOR INSTANCE
    const initialCode = `# ==========================================\n# CONFIGURATION\n# ==========================================\noptions:\n    prefix: &c&l[BROKEN]\n\ncommand /testbroken:\n    trigger\n        send "{@prefix} This will now be flagged!"`;

    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: initialCode,
        language: 'skript',
        theme: 'sk-repo-theme',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        minimap: { enabled: false },
        padding: { top: 20 },
        scrollBeyondLastLine: false,
        cursorSmoothCaretAnimation: true
    });

    // 4. ATTACH LINTER TO CONTENT CHANGES
    // Runs 800ms after user stops typing to save performance
    let analysisTimer;
    editor.onDidChangeModelContent(() => {
        clearTimeout(analysisTimer);
        analysisTimer = setTimeout(runAnalysis, 800);
    });

    // Run once on load to catch initial errors
    setTimeout(runAnalysis, 500);
});

/**
 * LINTER ENGINE
 * Checks for missing colons on triggers, commands, and events.
 */
function runAnalysis() {
    if (!editor) return;
    
    const model = editor.getModel();
    const lines = model.getLinesContent();
    let markers = [];
    let errorCount = 0;

    lines.forEach((content, i) => {
        const trimmed = content.trim();
        
        // Define what constitutes a "Header" in Skript
        const isEvent = trimmed.startsWith('on ');
        const isCommand = trimmed.startsWith('command ');
        const isTrigger = trimmed === 'trigger';
        const isOptions = trimmed === 'options';

        if ((isEvent || isCommand || isTrigger || isOptions) && !trimmed.endsWith(':')) {
            errorCount++;
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: 'Syntax Error: Missing required colon (:) at the end of this block.',
                startLineNumber: i + 1,
                startColumn: content.indexOf(trimmed) + 1,
                endLineNumber: i + 1,
                endColumn: content.length + 1
            });
        }
    });

    // Push red underlines to the UI
    monaco.editor.setModelMarkers(model, 'owner', markers);
    
    // Update Sidebar & Console
    updateUIState(errorCount);
}

/**
 * UI UPDATER
 * Manages the LED status and Console logging.
 */
function updateUIState(count) {
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (count > 0) {
        led.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
        text.innerText = `${count} Critical Issues`;
        logs.innerHTML += `<div class="text-red-400 border-l-2 border-red-500/30 pl-3">> Detected ${count} missing colons.</div>`;
    } else {
        led.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#238636]";
        text.innerText = "System Nominal";
    }
    logs.scrollTop = logs.scrollHeight;
}

/**
 * AUTO-FIX ENGINE
 * Corrects common syntax mistakes without breaking indentation.
 */
function applyAutoFix() {
    if (!editor) return;
    
    const model = editor.getModel();
    const lines = model.getLinesContent();
    
    const fixed = lines.map(line => {
        const trimmed = line.trim();
        const isHeader = trimmed.startsWith('on ') || 
                         trimmed.startsWith('command ') || 
                         trimmed === 'trigger' || 
                         trimmed === 'options';

        if (isHeader && !trimmed.endsWith(':')) {
            return line + ":";
        }
        return line;
    }).join('\n');

    // Use executeEdits so the fix can be UNDONE with Ctrl+Z
    editor.executeEdits("fixer", [{
        range: model.getFullModelRange(),
        text: fixed
    }]);

    document.getElementById('console-logs').innerHTML += `<div class="text-blue-400 border-l-2 border-blue-500/30 pl-3">> Auto-Fix: Added missing colons.</div>`;
    runAnalysis();
}