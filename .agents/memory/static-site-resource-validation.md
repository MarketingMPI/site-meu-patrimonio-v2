---
name: Static-site resource validation
description: Durable guidance for validating static sites with nested routes and shared assets.
---

Nested static pages can use both folder-local resources and shared root resources. A reliable pre-publish check must resolve each reference from the file that owns it, including CSS `url()` values and JavaScript-loaded assets, rather than assuming every path is root-relative.

**Why:** Route copies can look correct in source while silently requesting missing files at runtime, especially when a stylesheet or script is moved between a root page and a nested page.

**How to apply:** Validate the complete route set and report the owning page plus the unresolved URL. Keep external URL availability checks separate from local filesystem validation so local checks stay deterministic.