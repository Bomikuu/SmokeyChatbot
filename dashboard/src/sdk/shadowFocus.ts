import { useCallback, useLayoutEffect, useState, type Ref } from "react";

// Radix uses document.activeElement, which is the shadow host rather than the
// focused control. Bridge only scoped Shadow DOM dialogs; standalone stays native.
const scopes = new WeakMap<Document, HTMLElement[]>();
const activeElement = (document: Document): Element | null => {
  let current = document.activeElement;
  while (current?.shadowRoot?.activeElement) current = current.shadowRoot.activeElement;
  return current;
};
const tabbable = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]',
    ),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest('[hidden],[inert],[aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden",
  );
export const useShadowFocusScope = (forwardedRef?: Ref<HTMLDivElement>) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setContainer(node);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  useLayoutEffect(() => {
    if (!container || !(container.getRootNode() instanceof ShadowRoot)) return;
    const document = container.ownerDocument;
    const stack = scopes.get(document) || [];
    scopes.set(document, stack);
    const previous = activeElement(document);
    let last: HTMLElement | null = null;
    stack.push(container);
    const isTop = () => stack[stack.length - 1] === container;
    const portalledSelect = (target: Element) =>
      target.closest('[data-slot="select-content"]')?.getRootNode() === container.getRootNode();
    const focusInside = () => {
      const target =
        last?.isConnected && last.getClientRects().length
          ? last
          : tabbable(container)[0] || container;
      target.focus({ preventScroll: true });
    };
    const focusIn = (event: FocusEvent) => {
      if (!isTop()) return;
      const target = event.composedPath()[0];
      if (!(target instanceof HTMLElement)) return;
      if (container.contains(target)) last = target;
      else if (!portalledSelect(target)) focusInside();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (!isTop() || event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.composedPath()[0];
      if (target instanceof Element && portalledSelect(target)) return;
      const controls = tabbable(container),
        first = controls[0],
        end = controls[controls.length - 1];
      const focused = activeElement(document);
      if (!first) {
        event.preventDefault();
        container.focus();
      } else if (
        !container.contains(focused) ||
        (event.shiftKey ? focused === first : focused === end)
      ) {
        event.preventDefault();
        (event.shiftKey ? end : first).focus();
      }
    };
    document.addEventListener("focusin", focusIn, true);
    document.addEventListener("keydown", keyDown, true);
    return () => {
      stack.splice(stack.indexOf(container), 1);
      document.removeEventListener("focusin", focusIn, true);
      document.removeEventListener("keydown", keyDown, true);
      // Preserve the actual focused control for nested confirmation dialogs too.
      queueMicrotask(() => {
        const top = stack[stack.length - 1];
        if (
          previous instanceof HTMLElement &&
          previous.isConnected &&
          (!top || top.contains(previous))
        )
          previous.focus({ preventScroll: true });
      });
    };
  }, [container]);
  return ref;
};
