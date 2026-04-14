import { BatchSitting } from './src/app/interfaces/batch-sitting.interface';

const b: BatchSitting = {
  id: 1,
  batchName: 'test',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-01-01',
  stages: {} as any,
  createdAt: '',
  updatedAt: '',
  createdBy: '',
  submittedApplicationIds: [1, 2, 3]
};
console.log(b.submittedApplicationIds.length);
