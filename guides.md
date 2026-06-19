
--- Guide for anchor-positioning-tab-underline ---
In a tab menu, you should provide visual hints to users about what page they are on. One option is by underlining the tab. With anchor positioning, you can create a smooth animation between the positions of the underline. This does not work when changing the active tab loads a new web page.

You can also use this effect to add an animated dot to indicate the active tab in a vertical tab bar.

Create the underline using a `::before` pseudo-element on the `<ul>` that contains the `<li>` elements. **Using a pseudo-element is the preferred approach as it keeps the DOM clean and avoids adding extra elements for purely decorative effects.**

```css
ul::before {
  /* Use a pseudo-element on the container to represent the animated indicator */
  content: '';
}
```

Make the active list item an anchor by adding the `anchor-name` property, which has a value that starts with `--`.

```css
li.active {
  /* Make a unique anchor-name for the active element. */
  anchor-name: --active;
}
```

Tether the underline to the active item anchor with a `position-anchor` that matches the `anchor-name` on the anchor, and making it `position: absolute`.

```css
ul::before {
  /* Tether the underline to the active element. */
  position: absolute;
  position-anchor: --active;
}
```

Position the underline relative to the anchor using the inset properties and `anchor()` functions.

```css
ul::before {
  /* DO NOT use position-area, which can not be transitioned. */
  /* Use calc() to offset the top slightly */
  inset-block-start: calc(anchor(bottom) + .1lh);
  inset-inline-start: anchor(left);
  inset-inline-end: anchor(right);
}
```

Add a height and other visual styles.

```css
ul::before {
  /* Apply your project's styles for the indicator */
  block-size: .25lh;
  background: red;
}
```

Finally, add a transition on the `inset` properties.

```css
ul::before {
  @media (prefers-reduced-motion: no-preference) {
    /* MANDATORY: The transition must be wrapped in a prefers-reduced-motion media query to respect user preferences. */
    transition: inset .2s;
  }
}
```

This is only a visual indicator, and must not be a replacement for setting the appropriate `aria-current="page"` or `aria-selected` aria values.

```html
<!-- MANDATORY: Provide explicit assistive technology state alongside the visual tab underline -->
<nav aria-label="Primary">
  <ul>
    <li class="active">
      <a href="/home" aria-current="page">Home</a>
    </li>
    <li>
      <a href="/about">About</a>
    </li>
  </ul>
</nav>
```

## Fallback strategies

Anchor positioning is not natively supported by any major browser yet.

If anchor positioning is not supported in the browser, use a `border-bottom` to add an underline. It will not be animated.

```css
ul li.active {
  @supports not (position-anchor: auto) {
    /* Choose a color appropriate to the app theme. */
    border-bottom: .25lh var(--primary) solid;
  }
}
```

--- Guide for interest-triggered-tooltips ---
# Show a tooltip when hovering

Users expect to see additional related information without completely changing their context. Showing a tooltip when a user is interested in more information can be useful to provide definitions for a term, clarifying the action an icon-only button will take, or provide additional form field guidance.

## Creating the tooltip

You can create a popover with the required behavior by adding the `popover="hint"` attribute to a `<div>` or other semantically appropriate element. When the user opens the tooltip, this hides other `popover="hint"` tooltips, but doesn't hide `auto` or `manual` tooltips. It also handles dismissing nested tooltips.

It also provides light dismiss behavior, so when a user clicks or otherwise focuses outside of the popover, the popover is dismissed.

The tooltip element must have an `id` attribute with a unique value:

```html
<!-- MANDATORY: The tooltip container `<div>` must have a `popover` attribute.
     the value of `"hint"` ensures it can be "light dismissed". -->
<div popover="hint" id="tooltip">Tooltip content</div>
```

A user expresses interest in the additional information by hovering or focusing on an `<a>` or `<button>` element. The element must have an `interestfor` attribute that matches the `id` attribute of the tooltip.

```html
<!-- The `interestfor` attribute can be applied to a `<button>` element: -->
<button interestfor="tooltip">Tooltip trigger</button>

<!-- The `interestfor` attribute can also be applied to an `<a>` element: -->
<a interestfor="tooltip" href="">Tooltip trigger</a>
```

The trigger must have a visual indicator to indicate that there is additional information available by interacting with the trigger.

### Accessibility built in to `interestfor`

`interestfor` handles the assistive-technology wiring for you, so you generally do not need to add ARIA attributes manually:

- A target with `popover="hint"` gains an implicit minimum role of `tooltip`. **DO NOT** set `role="tooltip"` yourself.
- The browser implicitly associates the source element with the target via `aria-describedby` when the target is plaintext, or via `aria-details` when the target contains interactive content. **DO NOT** add `aria-describedby` or `aria-details` to the trigger.
- Because the association switches to `aria-details` when needed, the target IS allowed to contain interactive content (e.g. a link inside an "interest card").

### Accessibility Constraints (WCAG 1.4.13)

Even with `interestfor` handling the semantics above, your implementation MUST still satisfy WCAG 1.4.13 (Content on Hover or Focus):
- **Dismissible:** Users must be able to dismiss the tooltip without moving pointer hover or keyboard focus (e.g., by pressing the `Escape` key). The native `popover` attribute manages this binding automatically.
- **Hoverable:** The pointer must be able to move over the tooltip content itself without the tooltip disappearing. This allows users with magnification tools to read the tooltip text safely.
- **Persistent:** The tooltip must remain visible until the hover or focus trigger is removed, the user explicitly dismisses it, or its content is no longer valid.

### Positioning the tooltip

The tooltip can be positioned using anchor positioning. When the tooltip is opened using `interestfor`, the trigger becomes an implicit anchor for the tooltip, meaning you don't have to add `anchor-name` or `position-anchor` CSS properties. However, to support browsers without anchor positioning you must use the anchor positioning polyfill, which has several limitations for popovers. **MANDATORY:** Implicit anchors are NOT supported by the polyfill, so YOU MUST explicitly set an `anchor-name` on the trigger and `position-anchor` on the popover.


```css
/* MANDATORY: use explicit anchor names for compatibility with the polyfill */
button[interestfor="tooltip-dom"] {
  anchor-name: --tooltip-dom;
}
#tooltip-dom {
  position-anchor: --tooltip-dom;
}
```

Also, the polyfill does not support `position-area` on popovers, so **MANDATORY:** DO position using `anchor()` functions, and **YOU MUST** include a `position-try` fallback (e.g. `flip-block` or `flip-inline`).

```css
[popover]{
  /* MANDATORY: use anchor functions and a position-try fallback for the polyfill */
  top: anchor(bottom);
  left: anchor(center);
  position-try: flip-block;
  margin: unset;
}
```


### Fallback strategies

Interest invokers has limited availability.
Supported by: Chrome 142 (Oct 2025) and Edge 142 (Oct 2025).
Unsupported in: Firefox and Safari.

Interest invokers must be conditionally polyfilled using the `interestfor` polyfill package from NPM. Do prefer bundling the polyfill over using the CDN.

```html
<script type="module">
  if(!HTMLButtonElement.prototype.hasOwnProperty("interestForElement")){
    // CDN link only used for example, prefer bundling.
    await import("https://unpkg.com/interestfor@latest");
  }
</script>
```

Baseline status for Popover: Newly available. It's been Baseline since 2025-01-27.
Supported by: Chrome 116 (Aug 2023), Edge 116 (Aug 2023), Firefox 125 (Apr 2024), Safari 17 (Sep 2023), and Safari iOS 18.3 (Jan 2025).
popover="hint" has limited availability.
Supported by: Chrome 133 (Feb 2025), Edge 133 (Feb 2025), and Firefox 149 (Mar 2026).
Unsupported in: Safari.

Popover and popover hint must conditionally be polyfilled with the `@oddbird/popover-polyfill` polyfill. The hint behavior will not be polyfilled in browsers that support `popover` but not `popover="hint"`. For those browsers, a tooltip opened via focus may stay open when a second tooltip opened via hover.

```html
<script type="module">
  if(!HTMLElement.prototype.hasOwnProperty("popover")){
    await import("https://unpkg.com/@oddbird/popover-polyfill@latest");
  }
</script>
```

Anchor positioning is not natively supported by any major browser yet.

**MANDATORY:** To support browsers without anchor positioning, you MUST use the `@oddbird/css-anchor-positioning` polyfill. It does not support implicit anchors, so you MUST add anchor names to the trigger. Additionally, `position-area` is not supported on popovers by the polyfill, so you MUST use `anchor()` on the desired insets. 

```html
<!-- MANDATORY: Conditionally install the anchor positioning polyfill -->
<script type="module">
  if (!("anchorName" in document.documentElement.style)) {
    await import("https://unpkg.com/@oddbird/css-anchor-positioning");
  }
</script>
```

```css
button[interestfor="tooltip-attrs"] {
  /* MANDATORY: Each trigger and popover pair must have a unique anchor name, referenced by `anchor-name` on the trigger and `position-anchor` on the popover. */
  anchor-name: --tooltip-attrs;
}
#tooltip-attrs {
  position-anchor: --tooltip-attrs;
  /* If using the anchor positioning polyfill with a popover, DO use `anchor()` functions, and not `position-area. */
  top: anchor(bottom);
  left: anchor(right);
  margin: unset;
}
```

--- Guide for persistent-toast-notifications ---
# Creating Toast Notifications

Toast notifications are transient status messages. Unlike menus, they should not close when a user interacts with other parts of the page. The popover="manual" state is ideal because it lacks "light-dismiss" behavior and allows multiple notifications to coexist.

### Implementation Guidelines

* **MANDATORY:** Use popover="manual" so the notification stays visible until explicitly closed or timed out by a script.
* **DO** use a container to manage the stacking of multiple toasts. Since popovers in the Top Layer ignore parent z-index, you must position them individually or within a common layout group.
* **DO** use sibling-index() to add margin between toast notifications so that items lower in the stack are visible.
* **DO** provide an explicit "Close" button within the toast using popovertargetaction="hide".
* **DO** use JavaScript for auto-dismissal timers (e.g., calling hidePopover() after 3000ms).
* **DO** utilize transition-behavior: allow-discrete to animate the entry and exit from the Top Layer.

### Fallback Strategies

#### popover

* **Guidance:** Use the [Popover Polyfill](https://github.com/oddbird/popover-polyfill). For legacy browsers, fall back to a fixed-position div with a high z-index.

#### sibling-index()

* **Guidance:** If sibling-index() is not supported, use the `+` operator to add margin manually. I.e. `popover + popover { margin-top: 1rem }`

#### anchor-positioning

* **Guidance:** Use the [CSS Anchor Positioning Polyfill](https://github.com/oddbird/css-anchor-positioning). For a non-polyfill fallback, default the tooltip to a fixed position at the bottom of the viewport using `@supports not (anchor-name: --foo)`.

#### transition-behavior

* **Guidance:** If transition-behavior is not supported, use JavaScript to add animation via classes as the toast element transitions in and out.

--- Guide for search-hidden-content ---
# Search hidden content

Web interfaces often hide content from view to improve the user experience, save screen space, or increase page performance. Traditional methods like `display: none` or `visibility: hidden` work to hide content visually, but they also make that content completely inaccessible to screen readers and browser features like "Find in page".

To hide content visually but still allow it to be searchable by users and enable it to be deep linked to via URL fragments and "Scroll to Text Fragment" links, you can use either the HTML `<details>` element or the `hidden="until-found"` attribute. The `<details>` element is generally recommended as it's simpler to implement and maintain, but there are some more complex cases where `<details>` is not sufficient and `hidden="until-found"` is required.

For example:

- If you want full control over the styling of the show/hide mechanism.
- If the UI controls to show/hide the content are in another part of the DOM.
- If you don't want to support hiding the content after it's shown.

## How to implement

The `<details>` element has searchable and accessible text by default, and no special implementation is required. Prefer using `<details>` over `hidden="until-found"` if possible.

If you need to use `hidden="until-found"` instead, follow these instructions:

1. **Apply the attribute:** Add the `hidden="until-found"` HTML attribute directly to the elements containing the content that should be hidden from view.
2. **Synchronize UI state:** If the interface has related states that depend on the content's visibility (e.g., updating ARIA attributes, toggling open/close CSS classes, or rotating accordion icons):
   - You **MUST** add an event listener for the `beforematch` event.
   - Register the `beforematch` event listener directly on the element carrying the `hidden="until-found"` attribute. Since the event bubbles, you may alternatively use event delegation by registering a single listener on a parent element (such as a tab container) to manage multiple hidden sections at once.
   - Inside the event listener, execute the logic to synchronize related UI elements (such as closing other open tabs or changing the state of a toggle button).

## Example code

**Goal:** Render a hidden container where the content remains invisible to the user until they search for a word within that section.

### Using `<details>` element

```html
<details>
  <summary>Click to expand</summary>
  <p>This content is visually hidden.</p>
</details>
```

#### Mutually exclusive disclosures

When handling mutually exclusive content regions, like an exclusive accordion, use the native HTML `<details>` element with a shared `name` attribute.

```html
<div class="accordion-group">
  <!-- The name attribute creates an exclusive disclosure group -->
  <details class="disclosure" name="my-accordion">
    <summary>Section 1</summary>
    <p>Section 1 content</p>
  </details>

  <details class="disclosure" name="my-accordion" open>
    <summary>Section 2</summary>
    <p>Section 2 content</p>
  </details>

  <details class="disclosure" name="my-accordion">
    <summary>Section 3</summary>
    <p>Section 3 content</p>
  </details>
</div>
```

### Using `hidden="until-found"` attribute

```html
<!-- The browser automatically removes hidden="until-found" upon a search match -->
<div class="hidden-container" hidden="until-found">
  <p>This content is visually hidden.</p>
</div>
```

#### Custom mutually exclusive disclosures

When handling custom mutually exclusive regions controlled by external buttons, ensure only the matched panel remains visible. In the `beforematch` event handler, you MUST synchronize related ARIA states such as setting `aria-expanded="true"` on the controlling button.

```html
<div class="custom-accordion">
  <div class="controls">
    <button aria-expanded="true" aria-controls="panel-1" id="btn-1">Section 1</button>
    <button aria-expanded="false" aria-controls="panel-2" id="btn-2">Section 2</button>
  </div>

  <div id="panel-1" class="panel">
    <p>Section 1 content (visible)</p>
  </div>

  <div id="panel-2" class="panel" hidden="until-found">
    <p>Section 2 content (hidden)</p>
  </div>
</div>
```

```javascript
const accordion = document.querySelector('.custom-accordion');

accordion.addEventListener('beforematch', (e) => {
  // Hide all panels and synchronize button states before the browser reveals the matched panel
  accordion.querySelectorAll('.panel').forEach((panel) => {
    if (panel !== e.target) {
      panel.hidden = 'until-found';
    }
  });
  accordion.querySelectorAll('button').forEach((btn) => {
    const controls = btn.getAttribute('aria-controls');
    btn.setAttribute('aria-expanded', controls === e.target.id ? 'true' : 'false');
  });
});
```

## Best practices for `hidden="until-found"`

- **DO** apply borders, padding, and backgrounds to nested child wrappers rather than directly to the element with the `hidden="until-found"` attribute. This prevents unintended layout shifts or visual remnants while the element is hidden.
- **DO NOT** apply `display: none`, `visibility: hidden`, or any associated `display` or `visibility` CSS properties directly to elements with the `hidden="until-found"` attribute. This breaks the native functionality and permanently hides the content from the search index.
- **DO NOT** use `hidden="until-found"` for sensitive information, internal data tokens, or irrelevant data that should not be exposed via search.
- **DO NOT** use `hidden="until-found"` as a replacement for "screen reader only" (.sr-only) text.

## Browser support and fallback strategies

The `<details>` element is Baseline Widely available, so a fallback strategy is not required.

The `hidden="until-found"` attribute is not yet Baseline Widely available, but it can be safely used with a fallback in unsupporting browsers. **DO NOT** avoid `hidden="until-found"` because of missing browser support, as its accessiblity benefits far outweigh the cost of implementing a fallback.

#### `hidden="until-found"` fallback

For standard UI elements like accordions or "Read more" sections, use JavaScript to feature-detect and show all content if the feature is unsupported.

```javascript
if (!('onbeforematch' in HTMLElement.prototype)) {
  // Expand all hidden content for unsupported browsers
  document.querySelectorAll('[hidden="until-found"]').forEach((el) => {
    el.removeAttribute('hidden');
    // MANDATORY: also update any aria references to this element.
  });
}
```

For mutually exclusive UI paradigms (like custom exclusive panels where content shares the same visual region), the fallback should extract and display all content linearly below the main interactive area, using URL anchor fragments to allow users to navigate directly to the respective sections.


--- Guide for calculate-with-intrinsic-sizes ---
`calc-size()` is a CSS function for performing mathematical operations on intrinsic sizing keywords like `auto`, `min-content`, and `fit-content`. **MANDATORY**: Use `calc-size()` only when you need to modify an intrinsic size with a calculation or constraint; for simple keyword-based animations (e.g., `0` to `auto`), you must use `interpolate-size: allow-keywords`.

## Implementation Steps

1. **Identify the Intrinsic Basis**: Determine which intrinsic keyword (`auto`, `min-content`, etc.) should form the base of your calculation.
2. **Define Constraints**: Use CSS math functions like `clamp()`, `min()`, or `max()` within the second argument to enforce design constraints on the intrinsic size.
3. **MANDATORY: Provide a Fallback**: Always declare a standard sizing keyword or length immediately before the property using `calc-size()` to ensure the layout remains functional in unsupported browsers.
4. **Apply Logical Properties**: Default to using logical properties like `inline-size` or `block-size` to ensure the calculations respect the document's writing mode.
5. **Optional: Progressive Enhancement**: Wrap complex layout logic or animations in a `@supports (inline-size: calc-size(auto, size + 0px))` block to deliver advanced features only to capable browsers.

## Basic Syntax

```css
/* calc-size(<calc-size-basis>, <calc-sum>) — mathematical operations on intrinsic sizing keywords */
.element {
  /* MANDATORY: Always provide a fallback for browsers that do not support calc-size() */
  inline-size: min-content;
  
  /* DO: Use calc-size to modify an intrinsic basis with a calculation or function */
  inline-size: calc-size(min-content, size + 2rem);
}
```

### Valid Basis Arguments (`<calc-size-basis>`)
The first argument defines the "base" size for the calculation.

**Standard Keywords:**
- `auto`: The default sizing for the element.
- `min-content`: The smallest size the element can take without overflowing.
- `max-content`: The size the element takes to fit all content on one line.
- `fit-content`: Equivalent to `clamp(min-content, auto, max-content)`.
- `content`: Only valid when `calc-size()` is used within the `flex-basis` property.

**Special Arguments:**
- `any`: A generic basis used when the specific intrinsic type is unknown or when nesting calculations.
- Nested `calc-size()`: Allows for multi-step or conditional calculations.
- `<calc-sum>`: A specific length, percentage, or mathematical expression (e.g., `100px` or `20%`). When a fixed value is used as the basis, the **`size` keyword is still available** (but only within the second argument) and represents the resolved value of that basis.

**MANDATORY**: The `size` keyword is **not valid** within the first argument (`<calc-size-basis>`) itself. It is a local variable that only exists to refer back to the basis from within the second argument (`<calc-sum>`).

### Valid Calculation Arguments (`<calc-sum>`)
The second argument is the mathematical expression.
- It typically uses the `size` keyword to refer to the value of the basis.
- While the `size` keyword is technically optional, omitting it means the calculation will resolve to a fixed value, ignoring the basis entirely.
- It can include standard math operators (`+`, `-`, `*`, `/`).
- It can include CSS math functions like `clamp()`, `min()`, `max()`, and `round()`.
- **MANDATORY**: `calc-size()` only allows a **single** intrinsic size value (the basis) in each calculation. You cannot mix intrinsic sizing keywords in the same `calc-size()` call.

## Use Cases

### Animating to and from Intrinsic Sizes
By default, browsers cannot interpolate between a length (e.g., `0px`) and an intrinsic keyword (e.g., `auto`). Wrapping the keyword in `calc-size()` makes it an interpolatable value.

#### Choosing the Right Tool for Animations
- **MANDATORY: Use `interpolate-size: allow-keywords`**: For simple animations to or from intrinsic sizes (e.g., `height: 0` to `height: auto`) without any mathematical modifications. This is the required approach for simple keyword interpolation and should ideally be applied globally via `:root`.

  ```css
  :root {
    /* Best practice: Enable keyword interpolation globally */
    interpolate-size: allow-keywords;
  }

  .item {
    height: 0;
    transition: height 0.3s ease;
  }

  .item.open {
    /* Simple interpolation from 0 to auto now works without calc-size() */
    height: auto;
  }
  ```

- **Use `calc-size()`**: ONLY when you need to perform mathematical calculations on an intrinsic size during a transition (e.g., adding padding or clamping the size).

```css
.accordion-content {
  display: block;
  overflow: hidden;
  /* MANDATORY: Fallback value for closed state */
  block-size: 0;
  transition: block-size 0.3s ease-out;
}

.accordion-content.open {
  /* MANDATORY: Fallback value for open state */
  block-size: auto;

  /* 
    DO: Use calc-size(auto, ...) to enable animation from 0 to the element's 
    intrinsic size while doing a calculation (in this case, adding a space of 2rem).
  */
  block-size: calc-size(auto, size + 2rem);
}
```

**MANDATORY**: Interpolation between two intrinsic sizing keywords is not possible directly. One end of the transition must be a length or a percentage.

#### Respecting User Motion Preferences
Animations that change the size of large layout areas can be particularly disruptive for users with vestibular disorders. **MANDATORY**: Always respect user motion preferences by using the `prefers-reduced-motion` media query to simplify or minimize non-essential animations. Common strategies include disabling motion entirely, reducing duration, or replacing layout shifts with subtle opacity transitions.

```css
.accordion-content {
  opacity: 0;
  transition: block-size 0.3s ease, opacity 0.3s ease;
}

.accordion-content.open {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .accordion-content {
    /* 
       EXAMPLE: Replacing disruptive layout animations with a subtle fade-in.
       Setting the block-size instantly and transitioning opacity 
       provides a clear state change without large-scale motion.
    */
    transition: opacity 1.5s ease;
  }

  .accordion-content.open {
    /* Jump the size instantly */
    block-size: auto;
  }
}
```


### Applying Constraints to Intrinsic Sizes
You can use `calc-size()` with any CSS math function—such as `min()`, `max()`, `clamp()`, or `round()`—to ensure an element's intrinsic size remains within design boundaries.

```css
.dynamic-container {
  /* MANDATORY: Always provide a fallback for browsers that do not support calc-size() */
  inline-size: fit-content;

  /* 
    DO: Establish a dynamic size based on content, while:
    1. Enforcing boundaries using CSS math functions (min, clamp, etc.)
    2. Modifying the intrinsic size with fixed or relative offsets
  */
  inline-size: calc-size(fit-content, min(size + var(--extra-space), var(--max-allowed)));
}
```

## Critical Considerations

- **Percentage Pitfalls**: Percentages inside the `<calc-sum>` are resolved against the **container's size**, not the `size` keyword. For example, `calc-size(auto, size + 10%)` adds 10% of the *parent's* width to the element's `auto` width, which may lead to unexpected results or overflows.
- **Calculations requirement**: **MANDATORY**: Use `interpolate-size: allow-keywords` instead of `calc-size()` for simple animations (e.g., `0` to `auto`). `calc-size()` should only be used when the layout requires dynamic mathematical adjustments to the intrinsic base.
- **Performance Note**: Animating box model properties like `inline-size` or `block-size` triggers layout recalculations, which can be expensive. Use `calc-size()` animations primarily for layout-critical elements where non-layout alternatives are insufficient.

## Fallback strategies

calc-size() has limited availability.
Supported by: Chrome 129 (Sep 2024) and Edge 129 (Sep 2024).
Unsupported in: Firefox and Safari.
interpolate-size has limited availability.
Supported by: Chrome 129 (Sep 2024) and Edge 129 (Sep 2024).
Unsupported in: Firefox and Safari.

`calc-size()` and `interpolate-size` are **progressive enhancements**. In browsers that do not support them, the properties will be ignored and the layout will remain functional, though animations to intrinsic keywords will jump instead of transitioning. Always provide a standard keyword or length as a fallback.

```css
.element {
  /* Fallback for browsers that don't support calc-size() */
  inline-size: fit-content; 
  /* Modern browsers will override the fallback */
  inline-size: calc-size(fit-content, size + 2rem);
}
```

### Animation and Transition Fallbacks
In browsers without support for `calc-size()` or `interpolate-size`, transitions involving intrinsic sizing keywords will fail to interpolate. 

- **Graceful Degradation**: The default fallback is an "instant jump" between states (e.g., from `0` to `auto`). This is often acceptable as the layout remains functional.
- **Enhanced Experience**: Use `@supports` to apply complex layout logic or additional styling that only makes sense when smooth intrinsic animations are possible.
- **Avoid JS-based measurements**: While you could use JavaScript to measure elements and manually animate their dimensions, this is often unnecessary and can lead to layout thrashing. Relying on the native "instant jump" is the recommended fallback for modern web applications.

For animations, the fallback experience will be an instant jump to the final size. To detect support in CSS or JavaScript:

```css
/* CSS Feature Detection */
@supports (inline-size: calc-size(auto, size + 0px)) {
  .element {
    /* Apply advanced logic only when supported */
  }
}
```

```javascript
/* JavaScript Feature Detection */
if (CSS.supports('inline-size', 'calc-size(auto, size + 0px)')) {
  // Apply advanced sizing or animations
}
```

