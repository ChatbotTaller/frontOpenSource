import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { privacyConfig } from '../../core/privacy.config';

type PrivacySectionId = 'responsable' | 'datos' | 'proveedores' | 'seguridad' | 'conservacion' | 'referencias';

const PRIVACY_SECTIONS: ReadonlyArray<{ id: PrivacySectionId; number: string; label: string }> = [
  { id: 'responsable', number: '01', label: 'Responsable' },
  { id: 'datos', number: '02', label: 'Datos y finalidad' },
  { id: 'proveedores', number: '03', label: 'Servicios externos' },
  { id: 'seguridad', number: '04', label: 'Acceso y seguridad' },
  { id: 'conservacion', number: '05', label: 'Conservación' },
  { id: 'referencias', number: '06', label: 'Normativa' }
];

@Component({
  selector: 'app-privacy-notice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy-notice.component.html',
  styleUrl: './privacy-notice.component.css'
})
export class PrivacyNoticeComponent implements OnDestroy {
  @ViewChild('menuToggle') menuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuClose') menuClose?: ElementRef<HTMLButtonElement>;
  readonly privacyConfig = privacyConfig;
  readonly sections = PRIVACY_SECTIONS;
  activeSection: PrivacySectionId = 'responsable';
  sidebarOpen = false;
  private fragmentSubscription: Subscription;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.fragmentSubscription = this.route.fragment.subscribe(fragment => {
      const selected = this.sections.find(section => section.id === fragment);
      this.activeSection = selected?.id ?? 'responsable';
    });
  }

  selectSection(section: PrivacySectionId): void {
    this.activeSection = section;
    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: section,
      replaceUrl: true
    });

    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) {
      this.closeSidebar(false);
      requestAnimationFrame(() => {
        document.getElementById('policy-title')?.focus({ preventScroll: true });
        document.getElementById('section-content')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  }

  openSidebar(): void {
    this.sidebarOpen = true;
    requestAnimationFrame(() => this.menuClose?.nativeElement.focus());
  }

  closeSidebar(restoreFocus = true): void {
    if (!this.sidebarOpen) return;
    this.sidebarOpen = false;
    if (restoreFocus) {
      requestAnimationFrame(() => this.menuToggle?.nativeElement.focus());
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 760) {
      this.closeSidebar(false);
    }
  }

  ngOnDestroy(): void {
    this.fragmentSubscription.unsubscribe();
  }
}
