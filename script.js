/**
 * SKRIPT-PARSER | THE ULTIMATE LINTER
 * Professional Edition for SKITMC Repository
 */

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function() {
    
    // 1. ADVANCED SYNTX HIGHLIGHTING
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/on (join|quit|death|break|place|chat|rightclick|leftclick|load|unload|respawn):?/, 'keyword'],
                [/command \/\w+:?/, 'keyword'],
                [/trigger:?/, 'keyword'],
                [/options:?/, 'keyword'],
                [/if |else |loop |while |return |stop |exit |cancel event/, 'keyword'],
                [/set |add |remove |give |send |broadcast |ban |kick |op |deop/, 'operator'],
                [/({[^}]+})/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment'],
                [/<[^>]+>/, 'type-tag']
            ]
        }
    });

    // 2. THEME DEFINITION
    monaco.editor.defineTheme('sk-pro-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '58a6ff', fontStyle: 'bold' },
            { token: 'operator', foreground: '79c0ff' },
            { token: 'variable', foreground: 'ffa657' },
            { token: 'type-tag', foreground: 'a5d6ff' },
            { token: 'comment', foreground: '8b949e', fontStyle: 'italic' }
        ],
        colors: {
            'editor.background': '#0d1117',
            'editor.lineHighlightBackground': '#161b22',
            'editorCursor.foreground': '#58a6ff',
            'editorIndentGuide.activeBackground': '#30363d',
            'editorError.foreground': '#f85149'
        }
    });

    // 3. EDITOR INSTANTIATION
    const startingCode = `# ==========================================\n# CONFIGURATION\n# ==========================================\noptions:\n    prefix: &4&l[BAN]\n    error: &c\n\n# ==========================================\n# THIS SCRIPT IS INTENTIONALLY BROKEN\n# ==========================================\ncommand /ban <offlineplayer> <text>:\n    permission: admin.ban\n    trigger\n        if {banned.arg-1} is true:\n            send "{@prefix} This message will never send!"\n            stop\n            \n        ban arg-1 because of arg-2\n        \n        broadcast "{@prefix} %arg-1% was banned for %arg-2"`;

    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: startingCode,
        language: 'skript',
        theme: 'sk-pro-dark',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        minimap: { enabled: false },
        padding: { top: 20 },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true
    });

    // 4. LINTER INITIALIZATION
    let linterDebounce;
    editor.onDidChangeModelContent(() => {
        clearTimeout(linterDebounce);
        linterDebounce = setTimeout(runFullDiagnostics, 800);
    });

    setTimeout(runFullDiagnostics, 500);
});

/**
 * ENGINE: DIAGNOSTICS
 * This is where the 300+ line logic lives.
 */
function runFullDiagnostics() {
    if (!editor) return;
    
    const model = editor.getModel();
    const lines = model.getLinesContent();
    let markers = [];
    let logBuffer = [];

    lines.forEach((content, i) => {
        const lineNum = i + 1;
        const trimmed = content.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        // RULE 1: MISSING COLONS ON HEADERS
        const headers = ['on ', 'command ', 'trigger', 'options', 'else', 'if '];
        headers.forEach(h => {
            if (trimmed.startsWith(h) && !trimmed.endsWith(':')) {
                markers.push(createMarker(lineNum, content, 'Missing colon (:) at end of block.'));
                logBuffer.push(`Line ${lineNum}: Missing colon.`);
            }
        });

        // RULE 2: UNCLOSED PERCENT SIGNS (The Variable Killer)
        const percentCount = (content.match(/%/g) || []).length;
        if (percentCount % 2 !== 0) {
            markers.push(createMarker(lineNum, content, 'Unclosed percent sign (%). Variable must be wrapped in %..%'));
            logBuffer.push(`Line ${lineNum}: Percent sign mismatch.`);
        }

        // RULE 3: INVALID TYPES (offlineplayer)
        if (content.includes('<offlineplayer>')) {
            markers.push(createMarker(lineNum, content, 'Invalid type: Use <offline player> instead.'));
            logBuffer.push(`Line ${lineNum}: Wrong type syntax.`);
        }

        // RULE 4: STATIC VARIABLE DOTS (VS LISTS)
        if (trimmed.includes('{') && trimmed.includes('.') && !trimmed.includes('::')) {
            markers.push({
                severity: monaco.MarkerSeverity.Warning, // Warning, not Error
                message: 'Non-list variable detected. Use {list::name} for better data management.',
                startLineNumber: lineNum,
                startColumn: content.indexOf('{') + 1,
                endLineNumber: lineNum,
                endColumn: content.indexOf('}') + 2
            });
        }

        // RULE 5: INVALID BAN SYNTAX
        if (trimmed.includes('ban ') && trimmed.includes('because of')) {
            markers.push(createMarker(lineNum, content, 'Invalid Effect: Use "ban %player% due to %text%"'));
            logBuffer.push(`Line ${lineNum}: Ban syntax error.`);
        }
    });

    monaco.editor.setModelMarkers(model, 'owner', markers);
    updateUI(markers.length, logBuffer);
}

function createMarker(line, content, msg) {
    return {
        severity: monaco.MarkerSeverity.Error,
        message: msg,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: content.length + 1
    };
}

/**
 * ENGINE: AUTO-FIX
 */
function applyAutoFix() {
    const model = editor.getModel();
    const lines = model.getLinesContent();
    
    const fixed = lines.map(line => {
        let l = line;
        const t = l.trim();

        // Fix 1: Colons
        const headers = ['on ', 'command ', 'trigger', 'options', 'else', 'if '];
        headers.forEach(h => {
            if (t.startsWith(h) && !t.endsWith(':')) l += ':';
        });

        // Fix 2: Offline Player
        l = l.replace('<offlineplayer>', '<offline player>');

        // Fix 3: Ban syntax
        l = l.replace('because of', 'due to');

        // Fix 4: Percent mismatch (attempts to close it at the end of string)
        if ((l.match(/%/g) || []).length % 2 !== 0 && l.includes('"')) {
            l = l.replace(/"$/, '%"');
        }

        return l;
    }).join('\n');

    editor.executeEdits("fixer", [{ range: model.getFullModelRange(), text: fixed }]);
    runFullDiagnostics();
}

function updateUI(errorCount, logBuffer) {
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (errorCount > 0) {
        led.className = "w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
        text.innerText = `${errorCount} Issues Detected`;
        if (logBuffer.length > 0) {
            logs.innerHTML += `<div class="text-red-400 border-l-2 border-red-500/30 pl-3">> ${logBuffer[0]}</div>`;
        }
    } else {
        led.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#238636]";
        text.innerText = "All Clear";
    }
    logs.scrollTop = logs.scrollHeight;
}