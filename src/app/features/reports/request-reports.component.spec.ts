import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { FormCacheService } from '../../core/services/form-cache.service';
import { ToastService } from '../../core/services/toast.service';
import { RequestReportsService } from './request-reports.service';
import { RequestReportsComponent } from './request-reports.component';

function setup() {
  const response = { data: { items: [], pagination: { total_items: 0 } } };
  const service = { list: vi.fn((_query: unknown) => of(response)), exportExcel: vi.fn(), getExternalFieldOptions: vi.fn(() => of({data: []})) };
  TestBed.configureTestingModule({providers: [
    {provide: RequestReportsService, useValue: service},
    {provide: FormCacheService, useValue: {}},
    {provide: ToastService, useValue: {error: vi.fn()}},
  ]});
  return {component: TestBed.runInInjectionContext(() => new RequestReportsComponent()), service};
}
afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });
describe('Report filters', () => {
  it('debounces search and keeps export disabled until results match', () => {
    vi.useFakeTimers();
    const {component, service} = setup();
    component.selectForm('RDIG');
    component.search('RDIG-1'); component.search('RDIG-2');
    expect(component.pendingFilters()).toBe(true);
    component.exportExcel(); expect(service.exportExcel).not.toHaveBeenCalled();
    vi.advanceTimersByTime(450);
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(service.list.mock.calls[1][0]).toMatchObject({formCode:'RDIG', requestCode:'RDIG-2'});
    expect(component.pendingFilters()).toBe(false);
    component.ngOnDestroy();
  });
  it('waits for a complete custom range and resets without changing form', () => {
    const {component, service} = setup(); component.selectForm('JOURNAL');
    component.setPeriod('custom'); component.changeDate('2026-01-01', 'from');
    expect(service.list).toHaveBeenCalledTimes(1);
    component.changeDate('2026-10-15', 'to');
    expect(service.list).toHaveBeenCalledTimes(2);
    component.resetFilters();
    expect(service.list.mock.calls[2][0]).toMatchObject({formCode:'JOURNAL', dateFrom:'', dateTo:''});
    component.ngOnDestroy();
  });
  it('unsubscribes the previous request when switching forms', () => {
    const {component, service} = setup();
    const old = new Subject<any>(); service.list.mockReturnValueOnce(old);
    component.selectForm('CONFERENCE'); component.selectForm('RDIG');
    old.next({data:{items:[{request_id:99}], pagination:{total_items:1}}});
    expect(component.rows()).toEqual([]);
    expect(component.scopeDescription()).toBe('Approved RDIG applications only.');
    component.ngOnDestroy();
  });
});

