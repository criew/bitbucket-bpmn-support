(function () {
    'use strict';

    var fileHandlers;
    try {
        fileHandlers = require('bitbucket/feature/files/file-handlers');
    } catch (e) {
        return;
    }

    var BpmnViewer = window.__BpmnViewer;

    fileHandlers.register({
        weight: 100,
        handle: function (context) {
            var extension = (context.extension || '').toLowerCase();
            if (extension !== 'bpmn') {
                return null;
            }

            return {
                component: function (containerEl) {
                    var wrapper = document.createElement('div');
                    wrapper.className = 'bpmn-viewer-container';

                    var toolbar = document.createElement('div');
                    toolbar.className = 'bpmn-viewer-toolbar';

                    var zoomInBtn = document.createElement('button');
                    zoomInBtn.textContent = '+';
                    zoomInBtn.title = 'Zoom in';

                    var zoomOutBtn = document.createElement('button');
                    zoomOutBtn.textContent = '−';
                    zoomOutBtn.title = 'Zoom out';

                    var fitBtn = document.createElement('button');
                    fitBtn.textContent = '▣';
                    fitBtn.title = 'Fit to viewport';

                    toolbar.appendChild(zoomInBtn);
                    toolbar.appendChild(zoomOutBtn);
                    toolbar.appendChild(fitBtn);

                    var canvasEl = document.createElement('div');
                    canvasEl.className = 'canvas';

                    wrapper.appendChild(toolbar);
                    wrapper.appendChild(canvasEl);
                    containerEl.appendChild(wrapper);

                    var loadingEl = document.createElement('div');
                    loadingEl.className = 'bpmn-viewer-loading';
                    loadingEl.textContent = 'Loading BPMN diagram…';
                    canvasEl.appendChild(loadingEl);

                    var contextPath = typeof AJS !== 'undefined' ? AJS.contextPath() : '';
                    var url = contextPath + '/rest/api/latest/projects/' +
                        encodeURIComponent(context.project.key) + '/repos/' +
                        encodeURIComponent(context.repository.slug) + '/raw/' +
                        context.path + '?at=' + encodeURIComponent(context.revisionRef);

                    fetch(url, { credentials: 'same-origin' })
                        .then(function (response) {
                            if (!response.ok) throw new Error('HTTP ' + response.status);
                            return response.text();
                        })
                        .then(function (xml) {
                            canvasEl.removeChild(loadingEl);

                            if (!BpmnViewer) {
                                canvasEl.innerHTML = '<div class="bpmn-viewer-error">BPMN Viewer library not loaded.</div>';
                                return;
                            }

                            var viewer = new BpmnViewer({ container: canvasEl });
                            viewer.importXML(xml).then(function () {
                                viewer.get('canvas').zoom('fit-viewport');

                                zoomInBtn.addEventListener('click', function () {
                                    viewer.get('canvas').zoom(viewer.get('canvas').zoom() * 1.2);
                                });
                                zoomOutBtn.addEventListener('click', function () {
                                    viewer.get('canvas').zoom(viewer.get('canvas').zoom() / 1.2);
                                });
                                fitBtn.addEventListener('click', function () {
                                    viewer.get('canvas').zoom('fit-viewport');
                                });
                            }).catch(function (err) {
                                canvasEl.innerHTML = '<div class="bpmn-viewer-error">Error rendering BPMN: ' + err.message + '</div>';
                            });
                        })
                        .catch(function (err) {
                            canvasEl.innerHTML = '<div class="bpmn-viewer-error">Error loading file: ' + err.message + '</div>';
                        });
                },
                dispose: function () {}
            };
        }
    });
})();
