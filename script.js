/**
 * SKRIPT-PARSER | THE ULTIMATE LINTER
 * Professional RegEx Edition for SKITMC Repository
 */

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function() {
    
    // 1. LANGUAGE & SYNTAX DEFINITION
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/^(on |command |trigger|options|else|if ).*/, 'keyword'],
                [/(set|add|remove|give|send|broadcast|ban|kick|op|deop|stop)/, 'operator'],
                [/({[^}]+})/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment'],
                [/<[^>]+>/, 'type-tag']
            ]
        }
    });

    // 2. PROFESSIONAL THEME
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
            'editorIndentGuide.activeBackground': '#30363d'
        }
    });

    // 3. EDITOR INITIALIZATION
    const testCode = `# ==========================================\n# CONFIGURATION\n# ==========================================\noptions:\n    prefix: &4&l[BAN]\n    error: &c\n\n# ==========================================\n# THIS SCRIPT IS INTENTIONALLY BROKEN\n# ==========================================\ncommand /ban <offlineplayer> <text>:\n    permission: admin.ban\n    trigger\n        if {banned.arg-1} is true:\n            send "{@prefix} This player is already banned"\n            stop\n            \n        ban arg-1 because of arg-2\n        \n        broadcast "{@prefix} %arg-1% was banned for %arg-2"`;

    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: testCode,
        language: 'skript',
        theme: 'sk-pro-dark',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        minimap: { enabled: false },
        padding: { top: 20 },
        cursorSmoothCaretAnimation: true,
        scrollBeyondLastLine: false
    });

    // Linter Debounce (Runs 600ms after user stops typing)
    let linterDebounce;
    editor.onDidChangeModelContent(() => {
        clearTimeout(linterDebounce);
        linterDebounce = setTimeout(runDiagnostics, 600);
    });

    // Run initial scan
    setTimeout(runDiagnostics, 500);
});

/**
 * THE LINTER: Finds errors using strict RegEx
 */
function runDiagnostics() {
    if (!editor) return;
    const model = editor.getModel();
    const lines = model.getLinesContent();
    let markers = [];
    let errorCount = 0;

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        // Ignore empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) return;

        // 1. Missing Colons
        if (/^(on |command |trigger|options|else|if )/.test(trimmed) && !trimmed.endsWith(':')) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Missing colon (:) at end of header.'));
        }

        // 2. Invalid Type
        if (/<offlineplayer>/i.test(trimmed)) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Invalid type. Use <offline player>.'));
        }

        // 3. Static Dot Variables (e.g. {banned.arg-1})
        if (/\{[a-zA-Z0-9_-]+\.arg-\d+\}/.test(trimmed)) {
            errorCount++;
            markers.push({
                severity: monaco.MarkerSeverity.Warning, // Warning level for bad practices
                message: 'Improper variable nesting. Use lists with UUIDs: {list::%uuid of player%}',
                startLineNumber: lineNum,
                startColumn: line.indexOf('{') + 1,
                endLineNumber: lineNum,
                endColumn: line.indexOf('}') + 2
            });
        }

        // 4. Invalid Ban Syntax
        if (/ban .+ because of .+/.test(trimmed)) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Invalid syntax. Use "due to" instead of "because of".'));
        }

        // 5. Unclosed Percent Signs
        const percentMatches = line.match(/%/g);
        if (percentMatches && percentMatches.length % 2 !== 0) {
            errorCount++;
            markers.push(createMarker(lineNum, line, 'Unclosed percent sign (%). Variable will crash script.'));
        }
    });

    monaco.editor.setModelMarkers(model, 'owner', markers);
    updateUI(errorCount);
}

function createMarker(lineNum, content, msg) {
    return {
        severity: monaco.MarkerSeverity.Error,
        message: msg,
        startLineNumber: lineNum,
        startColumn: content.length - content.trimLeft().length + 1, // Start underline at actual text
        endLineNumber: lineNum,
        endColumn: content.length + 1
    };
}

/**
 * THE FIXER: Safely patches code using RegEx
 */
function applyAutoFix() {
    if (!editor) return;
    const model = editor.getModel();
    const lines = model.getLinesContent();
    
    const fixedLines = lines.map(line => {
        // Skip comments to prevent accidental replacement inside notes
        if (line.trim().startsWith('#')) return line;

        let patched = line;

        // Fix 1: Colons
        if (/^(on |command |trigger|options|else|if )/.test(patched.trim()) && !patched.trim().endsWith(':')) {
            patched = patched + ':';
        }

        // Fix 2: <offlineplayer> -> <offline player>
        patched = patched.replace(/<offlineplayer>/gi, '<offline player>');

        // Fix 3: ban because of -> due to
        patched = patched.replace(/(ban\s+.+?)\s+because of\s+(.+)/gi, '$1 due to $2');

        // Fix 4: Convert {var.arg-1} to {var::%uuid of arg-1%}
        patched = patched.replace(/\{([a-zA-Z0-9_-]+)\.arg-(\d+)\}/gi, '{$1::%uuid of arg-$2%}');

        // Fix 5: Missing percent sign before a closing quote
        patched = patched.replace(/%([a-zA-Z0-9_-]+)"/g, '%$1%"');

        return patched;
    });

    // Apply the edit safely so user can undo it if needed
    editor.executeEdits("ai-fixer", [{
        range: model.getFullModelRange(),
        text: fixedLines.join('\n')
    }]);

    runDiagnostics();
}

/**
 * DOM UPDATER: Handles the Sidebar LED and Console
 */
function updateUI(errorCount) {
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (errorCount > 0) {
        if (led) led.className = "w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
        if (text) text.innerText = `${errorCount} Issues Detected`;
        
        // Add a log entry if we don't already have one for this state
        if (logs && !logs.innerHTML.includes(`Scanner found ${errorCount} errors`)) {
            logs.innerHTML += `<div class="text-red-400 border-l-2 border-red-500/30 pl-3 py-1">> Scanner found ${errorCount} errors.</div>`;
        }
    } else {
        if (led) led.className = "w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#238636]";
        if (text) text.innerText = "All Clear";
        if (logs) logs.innerHTML += `<div class="text-green-400 border-l-2 border-green-500/30 pl-3 py-1">> Auto-fix applied. System nominal.</div>`;
    }
    
    // Auto-scroll the console
    if (logs) logs.scrollTop = logs.scrollHeight;
}