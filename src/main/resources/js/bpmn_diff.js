import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import BpmnModdle from 'bpmn-moddle';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';
import { diff } from 'bpmn-js-differ';
import DOMPurify from 'dompurify';

import '../css/app.css';
import '../css/bpmnio.css';
import '../css/diff.css';

const CHANGE_TYPES = {
    _removed: { label: 'Removed', cssClass: 'diff-removed', icon: '−' },
    _added: { label: 'Added', cssClass: 'diff-added', icon: '+' },
    _changed: { label: 'Changed', cssClass: 'diff-changed', icon: '≠' },
    _layoutChanged: { label: 'Layout', cssClass: 'diff-layout-changed', icon: '⇄' },
};

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function fetchBpmnXml(project, repository, path, ref) {
    const contextPath = typeof AJS !== 'undefined' ? AJS.contextPath() : '';
    const url = `${contextPath}/rest/api/latest/projects/${encodeURIComponent(project)}/repos/${encodeURIComponent(repository)}/raw/${path}?at=${encodeURIComponent(ref)}`;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Failed to fetch ${path} at ${ref}: ${response.status}`);
    return response.text();
}

async function parseBpmn(xml) {
    const moddle = new BpmnModdle({ camunda: camundaModdle });
    const { rootElement: definitions } = await moddle.fromXML(xml);
    return definitions;
}

function addMarkers(viewer, elementId, cssClass) {
    const canvas = viewer.get('canvas');
    try {
        canvas.addMarker(elementId, cssClass);
    } catch (e) {
        // element may not exist in this version
    }
}

function applyDiffOverlays(viewerOld, viewerNew, diffResult) {
    Object.entries(CHANGE_TYPES).forEach(([key, { cssClass }]) => {
        const elements = diffResult[key] || {};
        const ids = key === '_changed' || key === '_layoutChanged'
            ? Object.keys(elements)
            : (Array.isArray(elements) ? elements.map(e => e.id) : Object.keys(elements));

        ids.forEach(id => {
            if (key === '_removed') {
                addMarkers(viewerOld, id, cssClass);
            } else if (key === '_added') {
                addMarkers(viewerNew, id, cssClass);
            } else {
                addMarkers(viewerOld, id, cssClass);
                addMarkers(viewerNew, id, cssClass);
            }
        });
    });
}

function buildChangesTable(diffResult) {
    const rows = [];
    Object.entries(CHANGE_TYPES).forEach(([key, { label, icon }]) => {
        const elements = diffResult[key] || {};
        const items = key === '_changed' || key === '_layoutChanged'
            ? Object.keys(elements)
            : (Array.isArray(elements) ? elements.map(e => e.id) : Object.keys(elements));

        items.forEach(id => {
            rows.push({ id, label, icon, type: key });
        });
    });
    return rows;
}

function renderChangesPanel(diffResult, viewerOld, viewerNew) {
    const changesDiv = document.querySelector('#changes-overview .changes');
    if (!changesDiv) return;
    const rows = buildChangesTable(diffResult);

    if (rows.length === 0) {
        changesDiv.innerHTML = '<p style="padding:12px;color:#6b778c">No changes detected.</p>';
        return;
    }

    const table = document.createElement('table');
    rows.forEach(({ id, label, icon, type }) => {
        const tr = document.createElement('tr');
        tr.innerHTML = DOMPurify.sanitize(
            `<td class="change-icon">${icon}</td><td>${label}</td><td>${id}</td>`
        );
        tr.addEventListener('mouseenter', () => {
            addMarkers(viewerOld, id, 'highlight-marker');
            addMarkers(viewerNew, id, 'highlight-marker');
        });
        tr.addEventListener('mouseleave', () => {
            try { viewerOld.get('canvas').removeMarker(id, 'highlight-marker'); } catch(e) {}
            try { viewerNew.get('canvas').removeMarker(id, 'highlight-marker'); } catch(e) {}
        });
        tr.addEventListener('click', () => {
            const viewer = type === '_removed' ? viewerOld : viewerNew;
            try {
                const canvas = viewer.get('canvas');
                canvas.zoom('fit-viewport');
                const el = viewer.get('elementRegistry').get(id);
                if (el) canvas.scrollToElement(el);
            } catch(e) {}
        });
        table.appendChild(tr);
    });
    changesDiv.innerHTML = '';
    changesDiv.appendChild(table);
}

async function init() {
    const project = getQueryParam('project');
    const repository = getQueryParam('repository');
    const path = getQueryParam('path');
    const fromRef = getQueryParam('fromRef');
    const toRef = getQueryParam('toRef');

    if (!project || !repository || !path || !toRef) {
        document.body.innerHTML = '<p style="padding:20px;color:#bf2600">Missing required parameters (project, repository, path, toRef).</p>';
        return;
    }

    if (!fromRef) {
        const leftContainer = document.querySelector('.di-container.left');
        if (leftContainer) leftContainer.style.display = 'none';
        const header = document.querySelector('.bpmn-diff-header');
        if (header) {
            header.querySelector('h2').textContent = 'BPMN Viewer';
            const legend = header.querySelector('.bpmn-diff-legend');
            if (legend) legend.style.display = 'none';
        }
        const viewer = new BpmnViewer({ container: '#canvas-right' });
        try {
            const xml = await fetchBpmnXml(project, repository, path, toRef);
            await viewer.importXML(xml);
            viewer.get('canvas').zoom('fit-viewport');
        } catch (err) {
            console.error('BPMN Viewer error:', err);
            document.body.innerHTML = `<p style="padding:20px;color:#bf2600">Error loading BPMN: ${DOMPurify.sanitize(err.message)}</p>`;
        }
        return;
    }

    const viewerOld = new BpmnViewer({ container: '#canvas-left' });
    const viewerNew = new BpmnViewer({ container: '#canvas-right' });

    try {
        const [xmlOld, xmlNew] = await Promise.all([
            fetchBpmnXml(project, repository, path, fromRef),
            fetchBpmnXml(project, repository, path, toRef),
        ]);

        const [defsOld, defsNew] = await Promise.all([
            parseBpmn(xmlOld),
            parseBpmn(xmlNew),
        ]);

        await Promise.all([
            viewerOld.importXML(xmlOld),
            viewerNew.importXML(xmlNew),
        ]);

        viewerOld.get('canvas').zoom('fit-viewport');
        viewerNew.get('canvas').zoom('fit-viewport');

        const diffResult = diff(defsOld, defsNew);
        applyDiffOverlays(viewerOld, viewerNew, diffResult);
        renderChangesPanel(diffResult, viewerOld, viewerNew);

    } catch (err) {
        console.error('BPMN Diff error:', err);
        document.body.innerHTML = `<p style="padding:20px;color:#bf2600">Error loading BPMN diff: ${DOMPurify.sanitize(err.message)}</p>`;
    }

    const toggle = document.querySelector('.show-hide-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.getElementById('changes-overview').classList.toggle('collapsed');
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
