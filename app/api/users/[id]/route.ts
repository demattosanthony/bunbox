/**
 * API Route: GET /api/users/[id]
 * Example: /api/users/123
 */

import type { ApiHandler } from '../../../../src/index';

export const GET: ApiHandler['GET'] = async (req, context) => {
  const { id } = context.params;
  
  // Mock user data
  const user = {
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    createdAt: new Date().toISOString(),
  };
  
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: ApiHandler['POST'] = async (req, context) => {
  const { id } = context.params;
  const body = await req.json();
  
  return new Response(JSON.stringify({
    message: 'User updated',
    id,
    data: body,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: ApiHandler['DELETE'] = async (req, context) => {
  const { id } = context.params;
  
  return new Response(JSON.stringify({
    message: 'User deleted',
    id,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

