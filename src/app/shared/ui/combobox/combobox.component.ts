import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, HostListener, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ComboboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

let nextComboboxId = 0;

@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combobox.component.html',
  styleUrl: './combobox.component.css',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ComboboxComponent),
    multi: true
  }]
})
export class ComboboxComponent implements ControlValueAccessor {
  @Input() options: readonly ComboboxOption[] = [];
  @Input() ariaLabel = 'Seleccionar opción';
  @Input() testId = '';
  @Input() placeholder = 'Seleccionar';

  readonly listboxId = `combobox-listbox-${nextComboboxId++}`;
  value: string | number | null = null;
  open = false;
  disabled = false;
  activeIndex = -1;

  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  get selectedLabel(): string {
    return this.options.find(option => Object.is(option.value, this.value))?.label || this.placeholder;
  }

  writeValue(value: string | number | null): void { this.value = value; }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.open = false;
  }

  toggle(): void {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) this.activeIndex = this.selectedIndex();
    this.onTouched();
  }

  choose(option: ComboboxOption): void {
    if (option.disabled) return;
    this.value = option.value;
    this.open = false;
    this.onChange(option.value);
    this.onTouched();
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (event.key === 'Escape') {
      this.open = false;
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.open && this.activeIndex >= 0) this.choose(this.options[this.activeIndex]);
      else this.toggle();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open) this.open = true;
      this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  closeFromOutside(event: PointerEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) this.open = false;
  }

  private selectedIndex(): number {
    const index = this.options.findIndex(option => Object.is(option.value, this.value));
    return index >= 0 ? index : this.options.findIndex(option => !option.disabled);
  }

  private moveActive(step: number): void {
    if (!this.options.length) return;
    let index = this.activeIndex;
    for (let attempts = 0; attempts < this.options.length; attempts++) {
      index = (index + step + this.options.length) % this.options.length;
      if (!this.options[index].disabled) {
        this.activeIndex = index;
        break;
      }
    }
  }
}
