---
name: Responsive visual checks
description: Reliable browser capture timing for pages that use smooth scrolling and reveal-on-scroll transitions.
---

For responsive visual review, scroll instantly to each section and wait for reveal transitions before capturing; smooth scrolling can produce blank intermediate frames that look like missing content.

**Why:** The site uses smooth scrolling and IntersectionObserver-driven reveal animations, so immediate screenshots after a programmatic scroll are not representative of the settled layout.

**How to apply:** Use settled top, middle, and bottom captures at phone, tablet, and desktop widths, and separately measure document overflow after excluding intentionally off-canvas menus and clipped marquees.