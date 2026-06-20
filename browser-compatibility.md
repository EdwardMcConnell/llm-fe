# Fe UI - Browser Compatibility Policy

The **Fe UI** framework is an LLM-native, Zero-Dependency DOM compiler. Because we do not compile to legacy JavaScript bundles or use heavy polyfills, our applications rely entirely on the native web platform's modern capabilities.

## Supported Environments

To run Fe-generated applications natively without errors, the target environment must support the following standards:

1. **Native Web Components (`CustomElementRegistry`)**
2. **ES6 Classes & Modules (`import` / `export`)**
3. **Template literals and modern syntax (Optional Chaining `?.`, Nullish Coalescing `??`)**
4. **Native Dialog Element (`<dialog>`)**
5. **Modern CSS Selectors (`:user-invalid`, `:has()`, Container Queries)**
6. **Fetch API & WebSockets**

### Recommended Browser Versions

Fe guarantees functional deterministic correctness in the following baseline browsers (and newer):

*   **Google Chrome:** 90+
*   **Mozilla Firefox:** 88+
*   **Apple Safari:** 14.1+
*   **Microsoft Edge:** 90+

## Unsupported Environments

*   **Internet Explorer 11 (or older)** is completely unsupported and will result in syntax errors.
*   **Older mobile browsers** without ES Modules support.

## Testing & Guarantees

As part of the Fe gauntlet, end-to-end (E2E) UI testing is strictly enforced via Puppeteer (Chromium engine) to ensure that the generated Direct-DOM manipulations behave identically and perfectly deterministically.
