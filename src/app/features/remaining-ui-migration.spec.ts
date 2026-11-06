import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DropdownComponent } from '../shared/components/dropdown/dropdown.component';
import { DatePickerComponent } from '../shared/components/date-picker/date-picker.component';
import { SubmissionsSearchComponent } from '../shared/components/submissions-search/submissions-search.component';
import { ReviewBlockComponent } from './rdig/components/review-block/review-block.component';

@Component({standalone:true,imports:[ReactiveFormsModule,FormsModule,DropdownComponent,DatePickerComponent],template:`<form [formGroup]="form"><app-dropdown ariaLabel="Activity month" [options]="months" [compareWith]="sameMonth" formControlName="month" /><app-dropdown label="Goals" [isMulti]="true" [maxSelections]="1" [options]="goals" formControlName="goals" /><app-date-picker ariaLabel="Project start date" formControlName="date" /></form>`})
class ApplicationControlsHarness {
  form = new FormGroup({month:new FormControl<string|number>('3'),goals:new FormControl<string[]>(['A']),date:new FormControl('2026-11-02',Validators.required)});
  months = [{value:2,label:'2'},{value:3,label:'3'}];goals=[{value:'A',label:'Goal A'},{value:'B',label:'Goal B'}];
  sameMonth=(left:unknown,right:unknown)=>Number(left)===Number(right);
}
describe('Remaining pages shared controls',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('restores a saved string month against numeric options and preserves numeric changes',async()=>{
  await TestBed.configureTestingModule({imports:[ApplicationControlsHarness]}).compileComponents();
  const fixture=TestBed.createComponent(ApplicationControlsHarness);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  const picker=fixture.debugElement.queryAll(By.directive(DropdownComponent))[0].componentInstance as DropdownComponent;
  expect(picker.selectedKey).toBe('1');picker.choose('0');expect(fixture.componentInstance.form.controls.month.value).toBe(2);
  fixture.componentInstance.form.controls.month.disable();fixture.detectChanges();picker.choose('1');expect(fixture.componentInstance.form.controls.month.value).toBe(2);fixture.destroy();
 });
 it('keeps maximum multi-selections and native date validation with shared pickers',async()=>{
  await TestBed.configureTestingModule({imports:[ApplicationControlsHarness]}).compileComponents();
  const fixture=TestBed.createComponent(ApplicationControlsHarness);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  const goal=fixture.debugElement.queryAll(By.directive(DropdownComponent))[1];goal.nativeElement.querySelector('[role="combobox"]').click();fixture.detectChanges();
  expect(goal.nativeElement.querySelector('[role="option"][aria-disabled="true"]').textContent).toContain('Goal B');
  const date=fixture.debugElement.query(By.directive(DatePickerComponent)).componentInstance as DatePickerComponent;date.clearDate();expect(fixture.componentInstance.form.controls.date.hasError('required')).toBe(true);
  date.writeValue('2026-11-05');expect(date.displayValue).toContain('Nov');
  expect(fixture.nativeElement.querySelector('select,input[type="date"],input[type="datetime-local"]')).toBeNull();fixture.destroy();
 });
 it('submits and resets list search using the shared filter grid without changing draft semantics',async()=>{
  await TestBed.configureTestingModule({imports:[SubmissionsSearchComponent]}).compileComponents();const fixture=TestBed.createComponent(SubmissionsSearchComponent);fixture.componentRef.setInput('value','existing');fixture.detectChanges();
  const searches:string[]=[];let reset=0;fixture.componentInstance.search.subscribe(value=>searches.push(value));fixture.componentInstance.refresh.subscribe(()=>reset++);
  const input=fixture.nativeElement.querySelector('input');input.value='  JOUR-260001  ';input.dispatchEvent(new Event('input'));fixture.detectChanges();expect(searches).toEqual([]);
  fixture.nativeElement.querySelector('button[type="submit"]').click();expect(searches).toEqual(['JOUR-260001']);fixture.componentInstance.refreshSearch();expect(reset).toBe(1);expect(fixture.componentInstance.draftValue()).toBe('');fixture.destroy();
 });
 it('preserves readonly and score-disabled review controls while exposing string score values',async()=>{
  await TestBed.configureTestingModule({imports:[ReviewBlockComponent]}).compileComponents();const fixture=TestBed.createComponent(ReviewBlockComponent);fixture.componentRef.setInput('commentControl',new FormControl('Existing review'));fixture.componentRef.setInput('showScore',true);fixture.componentRef.setInput('scoreControl',new FormControl('2'));fixture.componentRef.setInput('maxScore',3);fixture.componentRef.setInput('readonly',false);fixture.componentRef.setInput('scoreDisabled',false);fixture.detectChanges();
  const picker=fixture.debugElement.query(By.directive(DropdownComponent)).componentInstance as DropdownComponent;picker.choose('4');expect(fixture.componentInstance.scoreControl.value).toBe('3');fixture.componentRef.setInput('scoreDisabled',true);fixture.detectChanges();picker.choose('2');expect(fixture.componentInstance.scoreControl.value).toBe('3');fixture.destroy();
 });
});
