# Three.js Editor Extension for Google Chrome

A Chrome DevTools extension to manage any three.js project.

![Demo](/about/demo.gif)

Twin project of [WebGL GLSL Shader Editor Extension for Google Chrome](https://github.com/spite/ShaderEditorExtension)

### How to install ###

While in beta, you can load the extension from disk directly:
- Checkout the repo
- Open Chrome's Extensions page (``Settings / More tools / Extensions``)
- Enable ``Developer Mode``
- Click on ``Load unpacked extension`...
- Select the folder /src in the checked out project

Alternatively, you can pack the extension yourself and load by dropping the .crx file in the Extensions page.

### How to use ###

- Browse to a page with three.js content (you can find many here http://threejs.org/ or here https://www.chromeexperiments.com/webgl)
- Open DevTools
- Select the ``Three.js Editor`` tab
- The extension needs to instrument ``THREE``, so the inspected tab has to be reloaded with the script injected. Hit the ``Reload`` button
- If you are developing the page, make sure ``THREE`` is global
- The extension will begin to track Scene and other objects allocations
- Select an object to see its properties and change them

#### License ####

MIT licensed

Copyright (C) 2015 Jaume Sanchez Elias, http://www.clicktorelease.com