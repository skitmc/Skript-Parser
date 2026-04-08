require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function () {

    monaco.languages.register({ id: 'skript' });

    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/^(on\s.+|command\s.+|trigger|options|else if\s.+|else|if\s.+)/, 'keyword'],
                [/(set|add|remove|give|send|broadcast|ban|kick)/, 'operator'],
                [/\{[^}]+\}/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment'],
                [/<[^>]+>/, 'type-tag']
            ]
        }
    });

    monaco.editor.defineTheme('sk-pro-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: '58a6ff' },
            { token: 'operator', foreground: '79c0ff' },
            { token: 'variable', foreground: 'ffa657' },
            { token: 'comment', foreground: '8b949e' },
        ],
        colors: {
            'editor.background': '#0d1117'
        }
    });

    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: "",
        language: 'skript',
        theme: 'sk-pro-dark',
        fontSize: 14,
        automaticLayout: true,
        minimap: { enabled: false }
    });

    let debounce;
    editor.onDidChangeModelContent(() => {
        clearTimeout(debounce);
        debounce = setTimeout(runDiagnostics, 400);
    });
});


// =========================
// SAFE DIAGNOSTICS
// =========================
function runDiagnostics() {
    if (!editor) return;

    const model = editor.getModel();
    const lines = model.getLinesContent();

    let markers = [];
    let errorCount = 0;

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) return;

        const isHeader = /^(on\s.+|command\s.+|options|if\s.+|else if\s.+|else)$/.test(trimmed);

        // Missing colon (safe)
        if (isHeader && !trimmed.endsWith(':')) {
            errorCount++;
            markers.push(createMarker(lineNum, 'Missing ":" at end of statement'));
        }

        // Bad <offlineplayer>
        if (/<offlineplayer>/i.test(trimmed)) {
            markers.push(createWarning(lineNum, 'Use "<offline player>" instead'));
        }

        // Bad variable
        if (/\{[^}]+\.arg-\d+\}/.test(trimmed)) {
            markers.push(createWarning(lineNum, 'Avoid .arg-# inside variables'));
        }

        // Unclosed string (SAFE check)
        const quotes = line.split('"').length - 1;
        if (quotes % 2 !== 0) {
            errorCount++;
            markers.push(createMarker(lineNum, 'Unclosed string "'));
        }

        // Percent check (safe)
        const clean = line.replace(/"[^"]*"/g, '');
        const percentMatches = clean.match(/%/g);

        if (percentMatches && percentMatches.length % 2 !== 0) {
            errorCount++;
            markers.push(createMarker(lineNum, 'Unclosed % variable'));
        }
    });

    monaco.editor.setModelMarkers(model, 'owner', markers);
    updateUI(errorCount);
}


// =========================
// SAFE AUTO FIX (IMPORTANT)
// =========================
function applyAutoFix() {
    if (!editor) return;

    const model = editor.getModel();
    const lines = model.getLinesContent();

    const fixed = lines.map(line => {
        let trimmed = line;

        // ONLY fix these safely:

        // Fix <offlineplayer>
        trimmed = trimmed.replace(/<offlineplayer>/gi, '<offline player>');

        // Fix "because of"
        if (!trimmed.includes('"')) {
            trimmed = trimmed.replace(/because of/gi, 'due to');
        }

        return trimmed;
    });

    editor.executeEdits("fix", [{
        range: model.getFullModelRange(),
        text: fixed.join('\n')
    }]);

    runDiagnostics();
}


// =========================
// HELPERS
// =========================
function createMarker(line, message) {
    return {
        severity: monaco.MarkerSeverity.Error,
        message,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: 1
    };
}

function createWarning(line, message) {
    return {
        severity: monaco.MarkerSeverity.Warning,
        message,
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: 1
    };
}


// =========================
// UI
// =========================
function updateUI(errors) {
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (errors > 0) {
        led.className = "w-2.5 h-2.5 rounded-full bg-red-500";
        text.innerText = `${errors} Issues`;
        logs.innerHTML += `<div class="text-red-400">> ${errors} issues detected</div>`;
    } else {
        led.className = "w-2.5 h-2.5 rounded-full bg-green-500";
        text.innerText = "Clean";
        logs.innerHTML += `<div class="text-green-400">> No issues found</div>`;
    }

    logs.scrollTop = logs.scrollHeight;
}