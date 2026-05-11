(function () {
    'use strict';

    function addBpmnDiffButton() {
        var diffToolbars = document.querySelectorAll('.diff-toolbar, .file-toolbar');
        if (!diffToolbars.length) return;

        diffToolbars.forEach(function (toolbar) {
            if (toolbar.querySelector('.bpmn-diff-btn')) return;

            var container = toolbar.closest('.diff-content-container, [data-path]');
            if (!container) return;

            var path = container.getAttribute('data-path') || '';
            if (!path.toLowerCase().endsWith('.bpmn')) return;

            var btn = document.createElement('button');
            btn.className = 'aui-button aui-button-subtle bpmn-diff-btn';
            btn.textContent = 'BPMN Visual Diff';
            btn.title = 'Open visual BPMN diff in new tab';
            btn.addEventListener('click', function () {
                var contextPath = (typeof AJS !== 'undefined' && AJS.contextPath) ? AJS.contextPath() : '';
                var meta = document.querySelector('meta[name="bb-view-state"]');
                var pageState = {};
                if (meta) {
                    try { pageState = JSON.parse(meta.getAttribute('content') || '{}'); } catch(e) {}
                }

                var projectKey = pageState.project && pageState.project.key;
                var repoSlug = pageState.repository && pageState.repository.slug;
                var fromRef = pageState.pullRequest && pageState.pullRequest.fromRef && pageState.pullRequest.fromRef.latestCommit;
                var toRef = pageState.pullRequest && pageState.pullRequest.toRef && pageState.pullRequest.toRef.latestCommit;

                if (!projectKey || !repoSlug) {
                    var urlMatch = window.location.pathname.match(/\/projects\/([^/]+)\/repos\/([^/]+)/);
                    if (urlMatch) {
                        projectKey = projectKey || urlMatch[1];
                        repoSlug = repoSlug || urlMatch[2];
                    }
                }
                if (!fromRef || !toRef) {
                    var commits = document.querySelectorAll('[data-commitid]');
                    if (commits.length >= 2) {
                        fromRef = fromRef || commits[0].getAttribute('data-commitid');
                        toRef = toRef || commits[commits.length - 1].getAttribute('data-commitid');
                    }
                }

                if (projectKey && repoSlug && fromRef && toRef) {
                    var params = [
                        'project=' + encodeURIComponent(projectKey),
                        'repository=' + encodeURIComponent(repoSlug),
                        'path=' + encodeURIComponent(path),
                        'fromRef=' + encodeURIComponent(fromRef),
                        'toRef=' + encodeURIComponent(toRef)
                    ].join('&');
                    window.open(contextPath + '/plugins/servlet/bpmn-diff?' + params, '_blank');
                } else {
                    alert('Could not determine PR context for BPMN diff.');
                }
            });
            toolbar.appendChild(btn);
        });
    }

    if (typeof AJS !== 'undefined' && AJS.toInit) {
        AJS.toInit(function () {
            addBpmnDiffButton();
            var observer = new MutationObserver(function () {
                addBpmnDiffButton();
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();
