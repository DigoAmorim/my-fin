import { withErrorHandling } from '../../lib/api-errors';
import {
  createYield as create,
  deleteYield as remove,
  listYields as list,
  updateYield as update,
} from './yield-service';

export const listYields = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const createYield = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateYield = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteYield = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});
