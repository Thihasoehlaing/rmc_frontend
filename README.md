# RMCProject

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

### Shareable attachment viewer

Attachment previews open `/attachments/view?path=...&name=...` on the configured
`attachmentBaseUrl`. The backend serves this standalone page and its PDF.js assets
through the existing API Gateway/Lambda, including locally at localhost:8000.
The viewer reads the current browser's existing RMC bearer through an origin-checked
frontend session bridge; the backend checks access for every file request. No portal layout, CloudFront or new cookie is needed.

Deploy this frontend session bridge before publishing the backend viewer change. The backend
repository's `docs/attachment-viewer.md` describes PDF.js packaging and allowed frontend
framing. Old portal `/attachments/view` bookmarks redirect to the resources
viewer. The portal's existing authentication remains unchanged.
