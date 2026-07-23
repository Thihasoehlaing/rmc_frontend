import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextEditorComponent } from './text-editor.component';

describe('TextEditorComponent', () => {
  let component: TextEditorComponent;
  let fixture: ComponentFixture<TextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps safe rich text tags when sanitizing html for storage', () => {
    const html = '<h1>Heading</h1><p><strong>Bold</strong> <em>Italic</em> <u>Underlined</u></p>';

    expect(component.sanitizeForStorage(html)).toBe(html);
  });

  it('removes unsafe scripts and event handlers before storage', () => {
    const html = '<h2 onclick="alert(1)">Safe</h2><script>alert(1)</script>';

    expect(component.sanitizeForStorage(html)).toBe('<h2>Safe</h2>');
  });

  it('preserves Quill list indentation and alignment classes', () => {
    const html =
      '<ol><li class="ql-indent-1 unknown-class" data-list="checked">Nested</li></ol><p class="ql-align-center">Centered</p>';

    expect(component.sanitizeForStorage(html)).toBe(
      '<ol><li class="ql-indent-1" data-list="checked">Nested</li></ol><p class="ql-align-center">Centered</p>',
    );
  });

  it('keeps safe formatting added by the expanded toolbar', () => {
    const html =
      '<blockquote>Quote</blockquote><pre data-language="typescript" onclick="alert(1)">const x = 1;</pre><p><s>Strike</s> H<sub>2</sub>O X<sup>2</sup> <span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0); position: fixed;">Color</span></p>';

    expect(component.sanitizeForStorage(html)).toBe(
      '<blockquote>Quote</blockquote><pre data-language="typescript">const x = 1;</pre><p><s>Strike</s> H<sub>2</sub>O X<sup>2</sup> <span style="color: rgb(230, 0, 0); background-color: rgb(255, 255, 0)">Color</span></p>',
    );
  });

  it('keeps safe links and removes unsafe link protocols', () => {
    const html =
      '<p><a href="https://example.com" onclick="alert(1)">Safe</a> <a href="javascript:alert(1)">Unsafe</a></p>';

    expect(component.sanitizeForStorage(html)).toBe(
      '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe</a> <a>Unsafe</a></p>',
    );
  });

  it('keeps safe table markup and removes unsafe table attributes', () => {
    const html =
      '<table style="width:100%"><tbody><tr><td data-row="row-ab12" colspan="2" onclick="alert(1)">Cell</td><td rowspan="99">Unsafe span</td></tr></tbody></table>';

    expect(component.sanitizeForStorage(html)).toBe(
      '<table><tbody><tr><td data-row="row-ab12" colspan="2">Cell</td><td>Unsafe span</td></tr></tbody></table>',
    );
  });

  it('keeps empty inserted tables instead of treating them as blank content', () => {
    const html = '<table><tbody><tr><td data-row="row-ab12"><br></td></tr></tbody></table>';

    expect(component.sanitizeForStorage(html)).toBe(html);
  });
});
