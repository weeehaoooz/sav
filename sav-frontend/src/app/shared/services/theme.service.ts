import { Injectable, signal, effect, computed } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  themeMode = signal<ThemeMode>('dark');
  reducedAnimations = signal<boolean>(false);
  private systemDark = signal<boolean>(false);

  readonly isDark = computed(() => {
    const mode = this.themeMode();
    return mode === 'system' ? this.systemDark() : mode === 'dark';
  });

  constructor() {
    this.initSystemListener();
    this.loadPreferences();

    effect(() => {
      const mode = this.themeMode();
      const isDark = mode === 'system' ? this.systemDark() : mode === 'dark';
      
      if (isDark) {
        document.body.classList.remove('light-theme');
        document.body.dataset['agThemeMode'] = 'dark-blue';
      } else {
        document.body.classList.add('light-theme');
        document.body.dataset['agThemeMode'] = 'light';
      }
      this.savePreferences();
    });

    effect(() => {
      const reduced = this.reducedAnimations();
      if (reduced) {
        document.body.classList.add('reduced-animations');
      } else {
        document.body.classList.remove('reduced-animations');
      }
      this.savePreferences();
    });
  }

  private initSystemListener() {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemDark.set(query.matches);
    
    // Modern browsers support addEventListener on MediaQueryList
    query.addEventListener('change', (e) => {
      this.systemDark.set(e.matches);
    });
  }

  private loadPreferences() {
    const savedTheme = localStorage.getItem('themeMode') as ThemeMode;
    const savedAnim = localStorage.getItem('reducedAnimations');
    
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      this.themeMode.set(savedTheme);
    }
    
    if (savedAnim !== null) {
      this.reducedAnimations.set(savedAnim === 'true');
    } else {
      // Check system preference
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.reducedAnimations.set(prefersReduced);
    }
  }

  private savePreferences() {
    localStorage.setItem('themeMode', this.themeMode());
    localStorage.setItem('reducedAnimations', String(this.reducedAnimations()));
  }

  setThemeMode(mode: ThemeMode) {
    this.themeMode.set(mode);
  }

  toggleTheme() {
    const current = this.themeMode();
    if (current === 'system') {
      this.themeMode.set(this.systemDark() ? 'light' : 'dark');
    } else {
      this.themeMode.set(current === 'dark' ? 'light' : 'dark');
    }
  }

  toggleAnimations() {
    this.reducedAnimations.set(!this.reducedAnimations());
  }
}
