require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});

let editor;

require(['vs/editor/editor.main'], function() {
    // 1. Language Setup
    monaco.languages.register({ id: 'skript' });
    monaco.languages.setMonarchTokensProvider('skript', {
        tokenizer: {
            root: [
                [/on (join|quit|death|break|place|chat):?/, 'keyword'],
                [/command \/\w+:?/, 'keyword'],
                [/set |add |remove |give |send |broadcast/, 'operator'],
                [/({[^}]+})/, 'variable'],
                [/"[^"]*"/, 'string'],
                [/#[^#]*/, 'comment']
            ]
        }
    });

    // 2. Editor Initialization
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: "ENTER SKRIPT HERE\n\non join:\n\tsend \"Hello SKITMC!\"",
        language: 'skript',
        theme: 'vs-dark',
        fontFamily: 'JetBrains Mono',
        fontSize: 14,
        automaticLayout: true,
        minimap: { enabled: false },
        padding: { top: 16 },
        lineNumbersMinChars: 3
    });

    // Run analysis on change
    editor.onDidChangeModelContent(() => {
        clearTimeout(window.analysisTimer);
        window.analysisTimer = setTimeout(runAnalysis, 1000);
    });
});

function runAnalysis() {
    const code = editor.getValue();
    const lines = code.split('\n');
    let markers = [];
    let errorsFound = 0;

    lines.forEach((content, i) => {
        if ((content.includes('on ') || content.includes('command ')) && !content.trim().endsWith(':')) {
            errorsFound++;
            markers.push({
                severity: monaco.MarkerSeverity.Error,
                message: 'Missing colon (:)',
                startLineNumber: i + 1,
                startColumn: 1,
                endLineNumber: i + 1,
                endColumn: content.length + 1
            });
        }
    });

    monaco.editor.setModelMarkers(editor.getModel(), 'owner', markers);
    
    const led = document.getElementById('status-led');
    const text = document.getElementById('status-text');
    const logs = document.getElementById('console-logs');

    if (errorsFound > 0) {
        led.className = "w-2 h-2 rounded-full bg-red-500";
        text.innerText = "Syntax Issues";
        logs.innerHTML += `<div class="text-red-400">> Found ${errorsFound} formatting error(s)</div>`;
    } else {
        led.className = "w-2 h-2 rounded-full bg-green-500";
        text.innerText = "System Normal";
    }
}

function applyAutoFix() {
    const model = editor.getModel();
    const lines = model.getValue().split('\n');
    const fixed = lines.map(line => {
        if ((line.includes('on ') || line.includes('command ')) && !line.trim().endsWith(':')) {
            return line + ":";
        }
        return line;
    }).join('\n');

    editor.executeEdits("fix", [{ range: model.getFullModelRange(), text: fixed }]);
    runAnalysis();
}