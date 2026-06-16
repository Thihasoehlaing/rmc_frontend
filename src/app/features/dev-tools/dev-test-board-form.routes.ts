import { Routes } from '@angular/router';

export const DEV_TEST_BOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dev-test-board-form.component').then(m => m.DevTestBoardFormComponent),
  },
];
