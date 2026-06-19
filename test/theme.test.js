import { describe, it, expect, vi } from 'vitest';
import { parseOklch, isAccessibleContrast, generateDarkModeOklch, ThemeProvider, defaultTokens } from '../src/theme.js';

describe('Fe Aesthetic Engine (OKLCH)', () => {
  it('should parse OKLCH strings correctly', () => {
    const color = parseOklch('oklch(0.9 0.05 250)');
    expect(color).toEqual({ l: 0.9, c: 0.05, h: 250 });
  });

  it('should return null for invalid strings', () => {
    expect(parseOklch('#FF0000')).toBeNull();
  });

  it('should calculate accessible contrast mathematically (Delta L >= 0.4)', () => {
    // Delta L = 0.98 - 0.2 = 0.78 (Accessible)
    expect(isAccessibleContrast('oklch(0.98 0.01 250)', 'oklch(0.2 0.02 250)')).toBe(true);
    
    // Delta L = 0.6 - 0.4 = 0.2 (Inaccessible)
    expect(isAccessibleContrast('oklch(0.6 0.1 0)', 'oklch(0.4 0.1 0)')).toBe(false);
  });

  it('should auto-generate mathematically perfect dark mode by inverting Lightness', () => {
    // Lightness 0.98 -> 0.02
    expect(generateDarkModeOklch('oklch(0.98 0.01 250)')).toBe('oklch(0.020 0.01 250)');
    
    // Lightness 0.2 -> 0.8
    expect(generateDarkModeOklch('oklch(0.2 0.02 250)')).toBe('oklch(0.800 0.02 250)');
  });

  it('should generate a Constructable Stylesheet with default tokens', () => {
    const provider = new ThemeProvider(defaultTokens);
    
    // Force light mode
    provider.setMode('light');
    
    // We can't easily parse CSSStyleSheet rules in JSDOM, 
    // but we can verify the instance exists and doesn't throw.
    expect(provider.sheet).toBeInstanceOf(CSSStyleSheet);
    expect(provider.isDark).toBe(false);
  });
});
