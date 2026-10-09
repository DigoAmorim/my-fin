import { Router } from 'express';
import { createYield, deleteYield, listYields, updateYield } from './yield-controller';

export const yieldRouter = Router();

yieldRouter.get('/', listYields);
yieldRouter.post('/', createYield);
yieldRouter.put('/:id', updateYield);
yieldRouter.delete('/:id', deleteYield);
