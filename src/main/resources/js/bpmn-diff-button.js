(function () {
    'use strict';

    var IFRAME_ID = 'bpmn-visual-diff-inline';

    function getPageContext() {
        var path = window.location.pathname;

        var prMatch = path.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/pull-requests\/(\d+)/);
        if (prMatch) {
            return { type: 'pr', project: prMatch[1], repo: prMatch[2], prId: prMatch[3] };
        }

        var commitMatch = path.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/commits\/([a-f0-9]+)/);
        if (commitMatch) {
            return { type: 'commit', project: commitMatch[1], repo: commitMatch[2], commitId: commitMatch[3] };
        }

        var compareMatch = path.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/(compare\/diff|pull-requests)/);
        if (compareMatch) {
            var params = new URLSearchParams(window.location.search);
            var sourceBranch = params.get('sourceBranch');
            var targetBranch = params.get('targetBranch');
            if (sourceBranch && targetBranch) {
                return { type: 'compare', project: compareMatch[1], repo: compareMatch[2], sourceBranch: sourceBranch, targetBranch: targetBranch };
            }
        }

        return null;
    }

    var contextPath = (typeof AJS !== 'undefined' && AJS.contextPath) ? AJS.contextPath() : '';

    var prDataCache = null;

    function fetchPrData(ctx) {
        if (prDataCache) return Promise.resolve(prDataCache);
        return fetch(contextPath + '/rest/api/latest/projects/' + ctx.project +
            '/repos/' + ctx.repo + '/pull-requests/' + ctx.prId,
            { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (pr) { prDataCache = pr; return pr; });
    }

    var commitDataCache = {};

    function fetchCommitParent(ctx) {
        if (commitDataCache[ctx.commitId]) return Promise.resolve(commitDataCache[ctx.commitId]);
        return fetch(contextPath + '/rest/api/latest/projects/' + ctx.project +
            '/repos/' + ctx.repo + '/commits/' + ctx.commitId,
            { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (commit) {
                var parentId = commit.parents && commit.parents.length > 0 ? commit.parents[0].id : null;
                var result = { fromRef: parentId, toRef: ctx.commitId };
                commitDataCache[ctx.commitId] = result;
                return result;
            });
    }

    function getDiffRefs(ctx) {
        if (ctx.type === 'pr') {
            return fetchPrData(ctx).then(function (pr) {
                return { fromRef: pr.fromRef.latestCommit, toRef: pr.toRef.latestCommit };
            });
        }
        if (ctx.type === 'commit') {
            return fetchCommitParent(ctx);
        }
        if (ctx.type === 'compare') {
            return Promise.resolve({ fromRef: ctx.targetBranch, toRef: ctx.sourceBranch });
        }
        return Promise.reject(new Error('Unknown page type'));
    }

    function createDiffButton(ctx, filePath) {
        var btn = document.createElement('button');
        btn.className = 'aui-button aui-button-light bpmn-diff-btn';
        btn.textContent = 'BPMN Visual Diff';
        btn.style.cssText = 'margin-left:4px;font-size:14px;padding:0 10px;height:32px;line-height:32px;vertical-align:middle;';

        var showingVisual = false;

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var changeView = btn.closest('.change-view') || document.querySelector('.change-view');
            if (!changeView) return;

            var diffView = changeView.querySelector('.diff-view');
            var existing = document.getElementById(IFRAME_ID);

            if (showingVisual) {
                if (existing) existing.style.display = 'none';
                if (diffView) diffView.style.display = '';
                btn.textContent = 'BPMN Visual Diff';
                showingVisual = false;
                return;
            }

            if (existing) {
                existing.style.display = '';
                if (diffView) diffView.style.display = 'none';
                btn.textContent = 'XML Diff';
                showingVisual = true;
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Laden...';

            getDiffRefs(ctx).then(function (refs) {
                var params = [
                    'project=' + encodeURIComponent(ctx.project),
                    'repository=' + encodeURIComponent(ctx.repo),
                    'path=' + encodeURIComponent(filePath),
                    'toRef=' + encodeURIComponent(refs.toRef),
                    'embedded=true'
                ];
                if (refs.fromRef) {
                    params.push('fromRef=' + encodeURIComponent(refs.fromRef));
                }
                params = params.join('&');

                var iframe = document.createElement('iframe');
                iframe.id = IFRAME_ID;
                iframe.src = contextPath + '/plugins/servlet/bpmn-diff?' + params;
                iframe.style.cssText = 'width:100%;height:700px;border:1px solid #dfe1e6;border-radius:3px;background:#fff;';
                iframe.frameBorder = '0';

                if (diffView) {
                    diffView.parentNode.insertBefore(iframe, diffView);
                    diffView.style.display = 'none';
                } else {
                    changeView.appendChild(iframe);
                }

                btn.disabled = false;
                btn.textContent = 'XML Diff';
                showingVisual = true;
            }).catch(function () {
                btn.disabled = false;
                btn.textContent = 'BPMN Visual Diff';
                alert('Fehler beim Laden der Diff-Daten.');
            });
        });
        return btn;
    }

    function scanForBpmnFiles() {
        var ctx = getPageContext();
        if (!ctx) return;

        if (document.querySelector('.bpmn-diff-btn')) return;

        var diffMeta = document.querySelector('.diff-meta');
        if (!diffMeta) return;

        var breadcrumbs = diffMeta.querySelector('.file-breadcrumbs');
        if (!breadcrumbs) return;

        var filePath = breadcrumbs.textContent.trim();
        if (!filePath.toLowerCase().endsWith('.bpmn')) return;

        var diffActions = diffMeta.closest('header, .change-header');
        var target = diffActions ? diffActions.querySelector('.diff-actions') : null;

        if (target) {
            target.insertBefore(createDiffButton(ctx, filePath), target.firstChild);
        } else {
            diffMeta.appendChild(createDiffButton(ctx, filePath));
        }
    }

    function init() {
        if (!getPageContext()) return;

        var scanTimeout;
        function debouncedScan() {
            clearTimeout(scanTimeout);
            scanTimeout = setTimeout(scanForBpmnFiles, 500);
        }

        setTimeout(scanForBpmnFiles, 2000);

        var target = document.getElementById('pull-requests-container')
            || document.getElementById('changes')
            || document.getElementById('content')
            || document.body;
        var observer = new MutationObserver(debouncedScan);
        observer.observe(target, { childList: true, subtree: true });
    }

    if (typeof AJS !== 'undefined' && AJS.toInit) {
        AJS.toInit(init);
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
