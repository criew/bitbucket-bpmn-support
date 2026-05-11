package com.github.criew.bitbucket.osgi;

import com.atlassian.bitbucket.auth.AuthenticationContext;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.sal.api.message.I18nResolver;
import com.atlassian.soy.renderer.SoyTemplateRenderer;
import com.atlassian.templaterenderer.TemplateRenderer;

@SuppressWarnings("unused")
final class ComponentImports {

    @ComponentImport
    private final I18nResolver i18nResolver;

    @ComponentImport
    private final SoyTemplateRenderer soyTemplateRenderer;

    @ComponentImport
    private final TemplateRenderer templateRenderer;

    @ComponentImport
    private final AuthenticationContext authenticationContext;

    private ComponentImports() {
        throw new UnsupportedOperationException("Not for instantiation");
    }
}
