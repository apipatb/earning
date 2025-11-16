import path from 'path';
import fs from 'fs';
import YAML from 'js-yaml';
import { Express } from 'express';
import { logger } from '../utils/logger';

/**
 * Load and parse OpenAPI specification from YAML file
 */
function loadOpenAPISpec(): Record<string, any> {
  try {
    const specPath = path.join(__dirname, '../docs/openapi.yaml');
    const specFile = fs.readFileSync(specPath, 'utf8');
    const spec = YAML.load(specFile);
    return spec as Record<string, any>;
  } catch (error) {
    logger.error('Failed to load OpenAPI spec:', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Serve Swagger UI HTML
 */
function getSwaggerUIHTML(specUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EarnTrack API - Swagger UI</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css">
      <style>
        html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
        }
        *, *:before, *:after {
          box-sizing: inherit;
        }
        body {
          margin: 0;
          padding: 0;
        }
        .swagger-container {
          max-width: 100%;
        }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-standalone-preset.js"></script>
      <script>
        const ui = SwaggerUIBundle({
          url: "${specUrl}",
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
        });
        window.onload = function() {
          window.ui = ui;
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Initialize Swagger UI for the Express app
 */
export function initSwagger(app: Express, basePath: string = '/api/v1'): void {
  try {
    // Load OpenAPI spec
    const spec = loadOpenAPISpec();

    // Serve OpenAPI spec as JSON
    app.get('/api-spec', (req, res) => {
      res.json(spec);
    });

    // Serve OpenAPI spec as YAML
    app.get('/api-spec.yaml', (req, res) => {
      res.type('application/yaml');
      res.sendFile(path.join(__dirname, '../docs/openapi.yaml'));
    });

    // Serve Swagger UI
    app.get('/api-docs', (req, res) => {
      res.type('text/html');
      res.send(getSwaggerUIHTML('/api-spec.yaml'));
    });

    // Redirect /docs to /api-docs for convenience
    app.get('/docs', (req, res) => {
      res.redirect('/api-docs');
    });

    logger.info('Swagger UI initialized', {
      swaggerUrl: '/api-docs',
      specUrl: '/api-spec.yaml',
    });
  } catch (error) {
    logger.error('Failed to initialize Swagger UI:', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - allow app to continue without Swagger UI if setup fails
  }
}

/**
 * Get OpenAPI spec for programmatic access
 */
export function getOpenAPISpec(): Record<string, any> {
  return loadOpenAPISpec();
}
