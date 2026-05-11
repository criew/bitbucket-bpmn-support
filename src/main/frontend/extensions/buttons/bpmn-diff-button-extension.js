/**
 * @clientside-extension
 * @extension-point bitbucket.ui.pullrequest.diff.toolbar
 */
export default function (pluginApi, context) {
    if (!context.change || !context.change.path || !context.change.path.endsWith('.bpmn')) {
        return { hidden: true };
    }

    var contextPath = typeof AJS !== 'undefined' ? AJS.contextPath() : '';

    return {
        hidden: false,
        label: 'BPMN Visual Diff',
        onAction: function () {
            var params = [
                'project=' + encodeURIComponent(context.project.key),
                'repository=' + encodeURIComponent(context.repository.slug),
                'path=' + encodeURIComponent(context.change.path),
                'fromRef=' + encodeURIComponent(context.pullRequest.fromRef.latestCommit),
                'toRef=' + encodeURIComponent(context.pullRequest.toRef.latestCommit),
            ].join('&');
            window.open(contextPath + '/plugins/servlet/bpmn-diff?' + params, '_blank');
        },
    };
}
