import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

import type { Env } from '../../env.ts';
import type { AuthVariables } from '../../lib/auth.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { json, notFound, unauthorized } from '../shared.ts';

import { CompleteWeekStartedSchema, WeeklyProgressionStatusSchema } from './schemas.ts';

const completeWeekRoute = createRoute({
  method: 'post',
  path: '/wf/complete-week',
  summary: "Complete the signed-in client's week (starts the Cloudflare Workflow)",
  responses: {
    200: json('Week completed workflow started', CompleteWeekStartedSchema),
    401: unauthorized,
  },
});

const weeklyProgressionStatusRoute = createRoute({
  method: 'get',
  path: '/wf/complete-week/{instanceId}',
  summary: 'Status of a complete-week workflow the signed-in client started',
  request: {
    params: z.object({
      instanceId: z.string().openapi({ param: { name: 'instanceId', in: 'path' } }),
    }),
  },
  responses: {
    200: json('Workflow status', WeeklyProgressionStatusSchema),
    401: unauthorized,
    404: notFound,
  },
});

function workflowIdFor(clientId: string): string {
  return `${clientId}-${crypto.randomUUID()}`;
}

function isOwnWorkflow(clientId: string, instanceId: string): boolean {
  return instanceId.startsWith(`${clientId}-`);
}

function toProgressionStatus(status: InstanceStatus['status']): 'running' | 'complete' | 'failed' {
  if (status === 'complete') return 'complete';
  if (status === 'errored' || status === 'terminated') return 'failed';
  return 'running';
}

export function cfWorkflowRoutes(): OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }> {
  const app = new OpenAPIHono<{ Bindings: Env; Variables: AuthVariables }>({ defaultHook });

  app.openapi(completeWeekRoute, async (c) => {
    const clientId = c.get('clientId');
    const instance = await c.env.STRENGTHSYNC_WORKFLOW.create({
      id: workflowIdFor(clientId),
      params: { clientId },
    });
    return c.json({ instanceId: instance.id, details: await instance.status() }, 200);
  });

  app.openapi(weeklyProgressionStatusRoute, async (c) => {
    const { instanceId } = c.req.valid('param');
    const missing = { error: { code: 'workflow_not_found', message: 'workflow not found' } };
    if (!isOwnWorkflow(c.get('clientId'), instanceId)) return c.json(missing, 404);
    let instance: WorkflowInstance;
    try {
      instance = await c.env.STRENGTHSYNC_WORKFLOW.get(instanceId);
    } catch {
      return c.json(missing, 404);
    }
    const { status } = await instance.status();
    return c.json({ status: toProgressionStatus(status) }, 200);
  });

  return app;
}
