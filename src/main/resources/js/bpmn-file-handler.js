(function () {
    'use strict';

    var BpmnViewer = window.__BpmnViewer;
    var VIEWER_ID = 'bpmn-viewer-container';
    var TOGGLE_CLASS = 'bpmn-toggle-btn';

    function isBpmnFile() {
        return /\/browse\/.*\.bpmn$/i.test(window.location.pathname);
    }

    function getFileRawUrl() {
        var contextPath = (typeof AJS !== 'undefined' && AJS.contextPath) ? AJS.contextPath() : '';
        var m = window.location.pathname.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/browse\/(.+\.bpmn)$/i);
        if (!m) return null;
        var ref = new URLSearchParams(window.location.search).get('at') || '';
        var url = contextPath + '/rest/api/latest/projects/' +
            encodeURIComponent(m[1]) + '/repos/' +
            encodeURIComponent(m[2]) + '/raw/' + m[3];
        if (ref) url += '?at=' + encodeURIComponent(ref);
        return url;
    }

    var viewerState = {
        wrapper: null,
        codeView: null,
        originalDisplay: '',
        showingDiagram: true
    };

    function showDiagram() {
        if (!viewerState.wrapper || !viewerState.codeView) return;
        viewerState.showingDiagram = true;
        viewerState.wrapper.style.display = '';
        viewerState.codeView.style.display = 'none';
        var btn = document.querySelector('.' + TOGGLE_CLASS);
        if (btn) btn.textContent = 'Quellcode';
    }

    function showSource() {
        if (!viewerState.wrapper || !viewerState.codeView) return;
        viewerState.showingDiagram = false;
        viewerState.wrapper.style.display = 'none';
        viewerState.codeView.style.display = viewerState.originalDisplay;
        var btn = document.querySelector('.' + TOGGLE_CLASS);
        if (btn) btn.textContent = 'Diagramm';
        var cm = viewerState.codeView.querySelector('.CodeMirror');
        if (cm && cm.CodeMirror) cm.CodeMirror.refresh();
        setTimeout(function () {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }

    function renderViewer() {
        if (document.getElementById(VIEWER_ID)) return;

        var fileContent = document.querySelector('#file-content, .file-content');
        if (!fileContent) return;

        var codeView = fileContent.querySelector(
            '.source-view, .content-view, .code-view, ' +
            '.refract-content-container, table.lines, pre.source, .CodeMirror'
        );
        if (!codeView) return;

        viewerState.codeView = codeView;
        viewerState.originalDisplay = codeView.style.display;

        var wrapper = document.createElement('div');
        wrapper.id = VIEWER_ID;
        wrapper.style.cssText = 'width:100%;height:600px;border:1px solid #dfe1e6;border-radius:3px;background:#fafbfc;position:relative;';
        viewerState.wrapper = wrapper;

        var zoomBar = document.createElement('div');
        zoomBar.style.cssText = 'position:absolute;top:8px;right:8px;z-index:10;display:flex;gap:4px;';

        var zoomIn = document.createElement('button');
        zoomIn.className = 'aui-button aui-button-subtle';
        zoomIn.textContent = '+';
        zoomIn.title = 'Zoom in';

        var zoomOut = document.createElement('button');
        zoomOut.className = 'aui-button aui-button-subtle';
        zoomOut.textContent = '−';
        zoomOut.title = 'Zoom out';

        var fit = document.createElement('button');
        fit.className = 'aui-button aui-button-subtle';
        fit.textContent = '▣';
        fit.title = 'Fit to viewport';

        zoomBar.appendChild(zoomIn);
        zoomBar.appendChild(zoomOut);
        zoomBar.appendChild(fit);

        var canvasEl = document.createElement('div');
        canvasEl.style.cssText = 'width:100%;height:100%;';

        wrapper.appendChild(zoomBar);
        wrapper.appendChild(canvasEl);

        codeView.style.display = 'none';
        codeView.parentNode.appendChild(wrapper);

        var url = getFileRawUrl();
        if (!url) return;

        fetch(url, { credentials: 'same-origin' })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
            .then(function (xml) {
                var viewer = new BpmnViewer({ container: canvasEl });
                viewer.importXML(xml).then(function () {
                    viewer.get('canvas').zoom('fit-viewport');
                    zoomIn.addEventListener('click', function () {
                        viewer.get('canvas').zoom(viewer.get('canvas').zoom() * 1.2);
                    });
                    zoomOut.addEventListener('click', function () {
                        viewer.get('canvas').zoom(viewer.get('canvas').zoom() / 1.2);
                    });
                    fit.addEventListener('click', function () {
                        viewer.get('canvas').zoom('fit-viewport');
                    });
                }).catch(function (err) {
                    wrapper.innerHTML = '<div style="padding:20px;color:#bf2600">Error rendering BPMN: ' + err.message + '</div>';
                });
            })
            .catch(function (err) {
                wrapper.innerHTML = '<div style="padding:20px;color:#bf2600">Error loading file: ' + err.message + '</div>';
            });
    }

    function tryAddToggle() {
        if (!document.getElementById(VIEWER_ID)) return;
        if (document.querySelector('.' + TOGGLE_CLASS)) return;

        var rawLink = null;
        var blameBtn = null;
        var allBtns = document.querySelectorAll('#file-content a, #file-content button, .file-content a, .file-content button');
        for (var i = 0; i < allBtns.length; i++) {
            var text = (allBtns[i].textContent || '').trim();
            if (text === 'Raw' || text === 'Unformatierte Datei' || text === 'Raw file') rawLink = allBtns[i];
            if (text === 'Blame') blameBtn = allBtns[i];
        }
        var toolbar = rawLink ? rawLink.parentElement : (blameBtn ? blameBtn.parentElement : null);
        if (!toolbar) return;

        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'aui-button aui-button-link ' + TOGGLE_CLASS;
        toggleBtn.textContent = viewerState.showingDiagram ? 'Quellcode' : 'Diagramm';
        toggleBtn.style.cssText = 'font-weight:600;';
        toggleBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (viewerState.showingDiagram) showSource();
            else showDiagram();
        });

        if (rawLink) {
            toolbar.insertBefore(toggleBtn, rawLink);
        } else {
            toolbar.appendChild(toggleBtn);
        }
    }

    function tick() {
        if (!isBpmnFile() || !BpmnViewer) return;
        renderViewer();
        tryAddToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(tick, 500); });
    } else {
        setTimeout(tick, 500);
    }

    var observer = new MutationObserver(function () { setTimeout(tick, 200); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
