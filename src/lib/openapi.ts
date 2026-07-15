import { createSwaggerSpec } from 'next-swagger-doc';

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'WordRush API',
        version: '1.0.0',
        description: 'REST API for the WordRush typing game.',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          supabaseSession: {
            type: 'apiKey',
            in: 'cookie',
            name: 'sb-access-token',
            description:
              'Supabase session cookie, set on login. Most endpoints read this via the server client rather than a header.',
          },
          cronSecret: {
            type: 'http',
            scheme: 'bearer',
            description:
              'Authorization: Bearer <CRON_SECRET>. Used by Vercel Cron to call scheduled endpoints.',
          },
        },
      },
      security: [],
    },
  });
}
