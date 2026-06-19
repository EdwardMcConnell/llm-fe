/**
 * Fe Aesthetic Engine: OKLCH & Constructable Stylesheets
 */

/**
 * Parses an OKLCH string like "oklch(0.9 0.05 250)" into its components.
 * @param {string} str 
 * @returns {{l: number, c: number, h: number} | null}
 */
export function parseOklch(str) {
  const match = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) return null;
  return {
    l: parseFloat(match[1]),
    c: parseFloat(match[2]),
    h: parseFloat(match[3])
  };
}

/**
 * Checks if the contrast between two OKLCH colors meets the basic accessibility threshold.
 * In OKLCH, a Lightness difference of >= 0.4 is a strong heuristic for readable text.
 * @param {string} bgOklch 
 * @param {string} fgOklch 
 * @returns {boolean}
 */
export function isAccessibleContrast(bgOklch, fgOklch) {
  const bg = parseOklch(bgOklch);
  const fg = parseOklch(fgOklch);
  if (!bg || !fg) return true; // Fail open if unparseable
  
  const deltaL = Math.abs(bg.l - fg.l);
  return deltaL >= 0.4;
}

/**
 * Generates the inverse dark mode OKLCH string by inverting the Lightness channel.
 * @param {string} lightOklch 
 * @returns {string}
 */
export function generateDarkModeOklch(lightOklch) {
  const c = parseOklch(lightOklch);
  if (!c) return lightOklch;
  
  // Invert the lightness. E.g. 0.98 -> 0.02
  // We keep C and H the same to preserve the exact brand hue/chroma.
  const darkL = (1.0 - c.l).toFixed(3);
  return `oklch(${darkL} ${c.c} ${c.h})`;
}

/**
 * The core Theme Provider.
 * Stores tokens, generates stylesheets, and manages Light/Dark modes natively.
 */
export class ThemeProvider {
  /**
   * @param {Record<string, string>} lightTokens - Base design tokens in OKLCH format
   */
  constructor(lightTokens) {
    this.lightTokens = lightTokens;
    this.darkTokens = {};
    
    // Auto-generate Dark Mode
    for (const [key, val] of Object.entries(lightTokens)) {
      if (val.startsWith('oklch')) {
        this.darkTokens[key] = generateDarkModeOklch(val);
      } else {
        this.darkTokens[key] = val; // Copy spacing/animation tokens directly
      }
    }

    // Constructable Stylesheet instance shared across all components
    this.sheet = new CSSStyleSheet();
    
    // Track current mode
    this.isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Listen for OS theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        this.setMode(e.matches ? 'dark' : 'light');
      });
    }

    this._compile();
  }

  /**
   * Forces a specific mode or toggles it.
   * @param {'light'|'dark'} mode 
   */
  setMode(mode) {
    this.isDark = mode === 'dark';
    this._compile();
  }

  /**
   * Validates the current theme for critical contrast failures.
   */
  validateContrast() {
    const bg = this.lightTokens['--surface-base'];
    const fg = this.lightTokens['--text-base'];
    if (bg && fg && !isAccessibleContrast(bg, fg)) {
      console.warn(`Fe: Critical Contrast Failure! Base surface and text have Delta L < 0.4.`);
    }
  }

  /**
   * @private
   */
  _compile() {
    const activeTokens = this.isDark ? this.darkTokens : this.lightTokens;
    let cssText = `:host {\n`;
    
    for (const [key, val] of Object.entries(activeTokens)) {
      cssText += `  ${key}: ${val};\n`;
    }
    
    cssText += `}\n`;
    
    // Phase 19: Shadow DOM Modern Reset
    // Obliterates the need for global normalize.css by natively normalizing every component
    cssText += `
*, *::before, *::after {
  box-sizing: border-box;
}
button, input, textarea, select {
  font: inherit;
}
p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
  margin: 0;
}
`;

    // Apply globally to the shared Constructable Stylesheet
    this.sheet.replaceSync(cssText);
  }
}

// The default "Fe Aesthetic"
export const defaultTokens = {
  // Vibrant Brand: Blue-ish
  '--brand-primary': 'oklch(0.6 0.15 250)',
  '--brand-secondary': 'oklch(0.7 0.1 280)',
  
  // Surfaces
  '--surface-base': 'oklch(0.98 0.01 250)',
  '--surface-elevated': 'oklch(1.0 0.0 0)',
  
  // Text
  '--text-base': 'oklch(0.2 0.02 250)',
  '--text-muted': 'oklch(0.4 0.01 250)',
  
  // Strict Transition Primitives
  '--anim-fast': '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  '--anim-spring': '400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

// Global Theme Singleton
export const globalTheme = new ThemeProvider(defaultTokens);
globalTheme.validateContrast();
