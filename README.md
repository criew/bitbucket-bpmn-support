# BPMN Support for Bitbucket Data Center

Bitbucket Data Center plugin for **BPMN file rendering** and **visual diff** based on [bpmn.io](https://bpmn.io).

Compatible with **Bitbucket Data Center 8.19+**.

## Features

### BPMN File Viewer (Repository Browse)
When browsing a repository, `.bpmn` files are rendered as visual diagrams instead of raw XML. Includes zoom controls and fit-to-viewport.

### BPMN Visual Diff (Pull Requests)
On pull request diff pages, a "BPMN Visual Diff" button appears for `.bpmn` files. Opens a side-by-side visual comparison showing:
- **Added** elements (green)
- **Removed** elements (red)
- **Changed** elements (orange)
- **Layout changes** (blue)

## Installation

Copy the built JAR into your Bitbucket shared plugins directory:

```
<bitbucket-home>/shared/plugins/installed-plugins/bitbucket-bpmn-support-1.0.0.jar
```

Then restart Bitbucket.

## Building

Prerequisites: Java 11+, Maven 3.9+ (or use the included Maven wrapper).

```bash
# Install frontend dependencies and build
npm install
npm run build:prod

# Build the plugin
./mvnw package -DskipTests
```

The plugin JAR will be at `target/bitbucket-bpmn-support-1.0.0.jar`.

## Credits

Based on [bpmn-diff-bitbucket-plugin](https://github.com/domclick/bpmn-diff-bitbucket-plugin) by DomClick.
Uses [bpmn-js](https://github.com/bpmn-io/bpmn-js) and [bpmn-js-differ](https://github.com/bpmn-io/bpmn-js-differ) from the bpmn.io project.

## License

MIT
