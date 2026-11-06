import { TestBed } from '@angular/core/testing';
import { DropdownComponent } from './dropdown.component';

describe('Normal dropdown', () => {
  it('renders options without a search input or clear button', async () => {
    await TestBed.configureTestingModule({ imports: [DropdownComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DropdownComponent);
    fixture.componentRef.setInput('label', 'Status');
    fixture.componentRef.setInput('options', [
      { value: '', label: 'All' },
      { value: 'Active', label: 'Active' },
    ]);
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[role="combobox"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sd-search-input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.clear-btn')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[role="option"]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('All');
  });

  it('preserves numeric, null and empty-string values', () => {
    const dropdown = new DropdownComponent();
    dropdown.options = [
      { value: null, label: 'Inherit' },
      { value: 7, label: 'Reviewer' },
      { value: '', label: 'All' },
    ];
    const values: unknown[] = [];
    dropdown.registerOnChange((value) => values.push(value));
    dropdown.writeValue(null);
    expect(dropdown.selectedKey).toBe('0');
    dropdown.choose('1');
    dropdown.choose('2');
    dropdown.choose('0');
    expect(values).toEqual([7, '', null]);
  });

  it('restores the selected value when options arrive or reorder', () => {
    const dropdown = new DropdownComponent();
    dropdown.writeValue(7);
    dropdown.options = [
      { value: 3, label: 'Three' },
      { value: 7, label: 'Seven' },
    ];
    expect(dropdown.selectedKey).toBe('1');
    dropdown.options = [
      { value: 7, label: 'Seven' },
      { value: 3, label: 'Three' },
    ];
    expect(dropdown.selectedKey).toBe('0');
  });

  it('does not emit selections while disabled or loading', () => {
    const dropdown = new DropdownComponent();
    dropdown.options = [{ value: 7, label: 'Seven' }];
    const values: unknown[] = [];
    dropdown.registerOnChange((value) => values.push(value));
    dropdown.setDisabledState(true);
    dropdown.choose('0');
    dropdown.setDisabledState(false);
    dropdown.loading = true;
    dropdown.choose('0');
    expect(values).toEqual([]);
  });
  it('preserves multi-selection values after asynchronous option reordering and removal', () => {
    const dropdown = new DropdownComponent();
    dropdown.writeValue(['JOUR', 'CONF']);
    dropdown.options = [
      { value: 'CONF', label: 'Conference' },
      { value: 'JOUR', label: 'Journal' },
    ];
    dropdown.isMulti = true;
    expect(dropdown.selectedKey).toEqual(['0', '1']);
    const values: unknown[] = [];
    dropdown.registerOnChange((value) => values.push(value));
    dropdown.choose(['1']);
    dropdown.options = [
      { value: 'JOUR', label: 'Journal' },
      { value: 'CONF', label: 'Conference' },
    ];
    expect(dropdown.selectedKey).toEqual(['0']);
    dropdown.choose([]);
    expect(values).toEqual([['JOUR'], []]);
  });

  it('provides an explicit nullable All option and removes it in multi mode', () => {
    const dropdown = new DropdownComponent();
    dropdown.options = [{ value: 4, label: 'Department' }];
    dropdown.emptyOptionLabel = 'All departments';
    dropdown.writeValue(null);
    expect(dropdown.selectedKey).toBe('0');
    const values: unknown[] = [];
    dropdown.registerOnChange((value) => values.push(value));
    dropdown.choose('1');
    dropdown.choose('0');
    expect(values).toEqual([4, null]);
    dropdown.isMulti = true;
    expect(dropdown.pickerOptions.map((option) => option.label)).toEqual(['Department']);
  });
});
