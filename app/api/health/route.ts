/**
 * API Route: GET /api/health
 * Health check endpoint
 */

import type { ApiHandler } from '../../../src/index';

export const GET: ApiHandler['GET'] = async (req, context) => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

