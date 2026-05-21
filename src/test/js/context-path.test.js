/**
 * @jest-environment jsdom
 */

/**
 * Tests for context path handling in BPMN diff URL construction.
 *
 * Verifies that all URL-building functions correctly prepend the
 * Bitbucket context path (e.g. "/bitbucket") when the instance
 * does not run at the root.
 */

function getContextPath() {
    if (typeof window.__bpmnContextPath === 'string') return window.__bpmnContextPath;
    if (typeof AJS !== 'undefined' && AJS.contextPath) return AJS.contextPath();
    return '';
}

function buildRawUrl(project, repository, path, ref) {
    const contextPath = getContextPath();
    const url = `${contextPath}/rest/api/latest/projects/${encodeURIComponent(project)}/repos/${encodeURIComponent(repository)}/raw/${path}?at=${encodeURIComponent(ref)}`;
    return url;
}

function buildServletUrl(contextPath, params) {
    return contextPath + '/plugins/servlet/bpmn-diff?' + params;
}

function getPageContext(pathname) {
    var prMatch = pathname.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/pull-requests\/(\d+)/);
    if (prMatch) {
        return { type: 'pr', project: prMatch[1], repo: prMatch[2], prId: prMatch[3] };
    }
    var commitMatch = pathname.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/commits\/([a-f0-9]+)/);
    if (commitMatch) {
        return { type: 'commit', project: commitMatch[1], repo: commitMatch[2], commitId: commitMatch[3] };
    }
    return null;
}

function getFileRawUrl(contextPath, pathname, search) {
    var m = pathname.match(/\/projects\/([^/]+)\/repos\/([^/]+)\/browse\/(.+\.bpmn)$/i);
    if (!m) return null;
    var params = new URLSearchParams(search);
    var ref = params.get('at') || '';
    var url = contextPath + '/rest/api/latest/projects/' +
        encodeURIComponent(m[1]) + '/repos/' +
        encodeURIComponent(m[2]) + '/raw/' + m[3];
    if (ref) url += '?at=' + encodeURIComponent(ref);
    return url;
}

beforeEach(() => {
    delete window.__bpmnContextPath;
    delete globalThis.AJS;
});

describe('getContextPath', () => {
    test('returns __bpmnContextPath when set (embedded iframe)', () => {
        window.__bpmnContextPath = '/bitbucket';
        expect(getContextPath()).toBe('/bitbucket');
    });

    test('returns AJS.contextPath() when AJS is available', () => {
        globalThis.AJS = { contextPath: () => '/bitbucket' };
        expect(getContextPath()).toBe('/bitbucket');
    });

    test('prefers __bpmnContextPath over AJS', () => {
        window.__bpmnContextPath = '/ctx';
        globalThis.AJS = { contextPath: () => '/ajs' };
        expect(getContextPath()).toBe('/ctx');
    });

    test('returns empty string when neither is available (root deployment)', () => {
        expect(getContextPath()).toBe('');
    });

    test('handles empty string __bpmnContextPath (root deployment)', () => {
        window.__bpmnContextPath = '';
        expect(getContextPath()).toBe('');
    });
});

describe('buildRawUrl (bpmn_diff.js fetchBpmnXml URL)', () => {
    test('includes context path in URL', () => {
        window.__bpmnContextPath = '/bitbucket';
        const url = buildRawUrl('PROJ', 'my-repo', 'path/to/process.bpmn', 'refs/heads/main');
        expect(url).toBe('/bitbucket/rest/api/latest/projects/PROJ/repos/my-repo/raw/path/to/process.bpmn?at=refs%2Fheads%2Fmain');
    });

    test('works without context path (root deployment)', () => {
        window.__bpmnContextPath = '';
        const url = buildRawUrl('PROJ', 'my-repo', 'process.bpmn', 'abc123');
        expect(url).toBe('/rest/api/latest/projects/PROJ/repos/my-repo/raw/process.bpmn?at=abc123');
    });

    test('encodes special characters in project/repo', () => {
        window.__bpmnContextPath = '/bitbucket';
        const url = buildRawUrl('MY PROJ', 'my repo', 'test.bpmn', 'main');
        expect(url).toContain('/projects/MY%20PROJ/repos/my%20repo/');
    });
});

describe('buildServletUrl (bpmn-diff-button.js iframe URL)', () => {
    test('includes context path', () => {
        const url = buildServletUrl('/bitbucket', 'project=P&repository=R');
        expect(url).toBe('/bitbucket/plugins/servlet/bpmn-diff?project=P&repository=R');
    });

    test('works at root', () => {
        const url = buildServletUrl('', 'project=P&repository=R');
        expect(url).toBe('/plugins/servlet/bpmn-diff?project=P&repository=R');
    });
});

describe('getPageContext with context path prefix', () => {
    test('matches PR URL with context path', () => {
        const ctx = getPageContext('/bitbucket/projects/PROJ/repos/my-repo/pull-requests/42/diff');
        expect(ctx).toEqual({ type: 'pr', project: 'PROJ', repo: 'my-repo', prId: '42' });
    });

    test('matches commit URL with context path', () => {
        const ctx = getPageContext('/bitbucket/projects/PROJ/repos/my-repo/commits/abc123def');
        expect(ctx).toEqual({ type: 'commit', project: 'PROJ', repo: 'my-repo', commitId: 'abc123def' });
    });

    test('matches PR URL at root', () => {
        const ctx = getPageContext('/projects/PROJ/repos/my-repo/pull-requests/1/diff');
        expect(ctx).toEqual({ type: 'pr', project: 'PROJ', repo: 'my-repo', prId: '1' });
    });
});

describe('getFileRawUrl (bpmn-file-handler.js)', () => {
    test('includes context path in raw URL', () => {
        const url = getFileRawUrl('/bitbucket', '/bitbucket/projects/PROJ/repos/my-repo/browse/path/to/process.bpmn', '?at=main');
        expect(url).toBe('/bitbucket/rest/api/latest/projects/PROJ/repos/my-repo/raw/path/to/process.bpmn?at=main');
    });

    test('works at root', () => {
        const url = getFileRawUrl('', '/projects/PROJ/repos/my-repo/browse/process.bpmn', '');
        expect(url).toBe('/rest/api/latest/projects/PROJ/repos/my-repo/raw/process.bpmn');
    });

    test('returns null for non-bpmn files', () => {
        const url = getFileRawUrl('/bitbucket', '/bitbucket/projects/PROJ/repos/my-repo/browse/readme.md', '');
        expect(url).toBeNull();
    });
});
