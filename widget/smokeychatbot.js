(function () {
  "use strict";

  if (typeof window === "undefined" || window.SmokeyChatBot) return;

  var STYLE = `
    :host { all: initial; --accent: #2f5bff; font-family: Arial, sans-serif; color: #0f172a; }
    *, *::before, *::after { box-sizing: border-box; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    .launcher { position: fixed; top: 0; left: 0; width: 96px; height: 128px; border: 0; padding: 0; background: transparent; pointer-events: auto; cursor: grab; touch-action: none; user-select: none; z-index: 2; transition: transform 1900ms cubic-bezier(.16,1,.3,1); }
    .launcher:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; border-radius: 8px; }
    .launcher.dragging { cursor: grabbing; transition: none; }
    .launcher.hidden { visibility: hidden; pointer-events: none; }
    .launcher.standard { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 18px; background: var(--accent); color: #fff; box-shadow: 0 12px 30px -14px rgba(15,23,42,.75); cursor: pointer; }
    .launcher.standard:hover { filter: brightness(.93); }
    .launcher.standard svg { width: 27px; height: 27px; }
    .mascot { display: block; width: 100%; height: 100%; background-repeat: no-repeat; image-rendering: pixelated; filter: drop-shadow(0 10px 10px rgba(15,23,42,.2)); }
    .mascot.static { object-fit: contain; image-rendering: auto; }
    .launcher:hover .mascot { filter: drop-shadow(0 13px 12px rgba(15,23,42,.27)); }
    .panel { position: fixed; width: min(360px, calc(100vw - 24px)); height: min(480px, calc(100dvh - 110px)); min-height: 280px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #dce4ef; border-radius: 16px; background: #fff; color: #0f172a; box-shadow: 0 24px 70px -36px rgba(15,23,42,.55); pointer-events: auto; z-index: 3; }
    .panel[hidden] { display: none; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
    .title { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; }
    .subtitle { margin: 3px 0 0; color: #64748b; font-size: 11px; }
    .header-actions { display: flex; align-items: center; gap: 4px; }
    .icon-button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: #475569; }
    .icon-button:hover { background: #f1f5f9; }
    .icon-button:focus-visible, .send:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 13px; }
    .message { max-width: 88%; align-self: flex-start; }
    .message.user { align-self: flex-end; }
    .bubble { margin: 0; padding: 10px 13px; border-radius: 12px 12px 12px 3px; background: #f1f5f9; font-size: 13px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .user .bubble { border-radius: 12px 12px 3px 12px; background: var(--accent); color: #fff; }
    .source-list { margin: 5px 0 0; color: #64748b; font-size: 11px; line-height: 1.4; }
    .composer { display: flex; align-items: center; gap: 8px; padding: 12px; border-top: 1px solid #e2e8f0; }
    .composer input { flex: 1; min-width: 0; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; color: #0f172a; font-size: 13px; }
    .composer input::placeholder { color: #64748b; }
    .send { flex: none; padding: 10px 13px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 700; }
    .send:disabled { opacity: .55; cursor: wait; }
    .status { min-height: 19px; margin: 0; padding: 0 14px 8px; color: #64748b; font-size: 11px; }
    @media (max-width: 640px) { .panel { left: 12px !important; right: 12px; top: auto !important; bottom: 100px; width: auto; min-height: 0; height: min(68dvh, calc(100dvh - 112px)); } }
    @media (prefers-reduced-motion: reduce) { .launcher { transition: none !important; } }
  `;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(name) {
    var paths = {
      chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h6"/>',
      close: '<path d="M5 5l14 14M19 5L5 19"/>',
      clear: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function readSession(key) {
    try {
      var value = JSON.parse(sessionStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.slice(-20) : [];
    } catch (_) { return []; }
  }
  function saveSession(key, messages) {
    try { sessionStorage.setItem(key, JSON.stringify(messages.slice(-20))); } catch (_) { /* storage may be disabled */ }
  }

  function mountSmokeyChatBot(options) {
    options = options || {};
    var siteId = String(options.siteId || "").trim();
    var apiBaseUrl = String(options.apiBaseUrl || "").replace(/\/$/, "");
    if (!siteId || !apiBaseUrl) throw new Error("siteId and apiBaseUrl are required.");
    var target = options.target || document.body;
    var host = element("div");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
    target.appendChild(host);
    var shadow = host.attachShadow({ mode: "open" });
    var style = element("style");
    style.textContent = STYLE;
    shadow.appendChild(style);
    var launcher = element("button", "launcher standard");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = icon("chat");
    shadow.appendChild(launcher);
    var panel = element("section", "panel");
    panel.hidden = true;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Website chat");
    var header = element("div", "header");
    var heading = element("div");
    var title = element("p", "title", "Website chat");
    var subtitle = element("p", "subtitle", "Ask a question");
    heading.append(title, subtitle);
    var actions = element("div", "header-actions");
    var clear = element("button", "icon-button");
    clear.type = "button";
    clear.setAttribute("aria-label", "Clear conversation");
    clear.title = "Clear conversation";
    clear.innerHTML = icon("clear");
    var close = element("button", "icon-button");
    close.type = "button";
    close.setAttribute("aria-label", "Close chat");
    close.innerHTML = icon("close");
    actions.append(clear, close);
    header.append(heading, actions);
    var messagesNode = element("div", "messages");
    messagesNode.setAttribute("role", "log");
    messagesNode.setAttribute("aria-live", "polite");
    var composer = element("form", "composer");
    var input = element("input");
    input.type = "text";
    input.maxLength = 2000;
    input.placeholder = "Ask a question…";
    input.setAttribute("aria-label", "Your message");
    var send = element("button", "send", "Send");
    send.type = "submit";
    composer.append(input, send);
    var status = element("p", "status");
    status.setAttribute("role", "status");
    panel.append(header, messagesNode, composer, status);
    shadow.appendChild(panel);

    var config = null;
    var storageKey = "smokeychatbot:" + siteId;
    var messages = readSession(storageKey);
    var open = false;
    var busy = false;
    var destroyed = false;
    var drag = null;
    var moved = false;
    var position = { x: 0, y: 0 };
    var roamTimer = null;
    var walkTimer = null;
    var frameIndex = 0;
    var mascotNode = null;

    function setPosition(x, y, immediate) {
      var rect = launcher.getBoundingClientRect();
      var width = rect.width || 58;
      var height = rect.height || 58;
      var previousX = position.x;
      position.x = clamp(x, 12, Math.max(12, window.innerWidth - width - 12));
      position.y = clamp(y, 12, Math.max(12, window.innerHeight - height - 12));
      if (mascotNode && config && config.mascotMode === "smokey" && Math.abs(position.x - previousX) > 2) {
        mascotNode.style.transform = position.x < previousX ? "scaleX(-1)" : "scaleX(1)";
      }
      if (immediate) launcher.style.transition = "none";
      launcher.style.transform = "translate3d(" + position.x + "px," + position.y + "px,0)";
      if (immediate) requestAnimationFrame(function () { if (!destroyed) launcher.style.transition = ""; });
      if (open) placePanel();
    }

    function anchorCorner() {
      var rect = launcher.getBoundingClientRect();
      setPosition(window.innerWidth - rect.width - 18, window.innerHeight - rect.height - 18, true);
    }

    function placePanel() {
      if (window.innerWidth <= 640) return;
      var panelWidth = Math.min(360, window.innerWidth - 24);
      var panelHeight = Math.min(480, window.innerHeight - 110);
      var x = clamp(position.x + launcher.offsetWidth - panelWidth, 12, window.innerWidth - panelWidth - 12);
      var y = position.y - panelHeight - 12;
      if (y < 12) y = clamp(position.y + launcher.offsetHeight + 12, 12, window.innerHeight - panelHeight - 12);
      panel.style.left = x + "px";
      panel.style.top = y + "px";
    }

    function renderMessages() {
      messagesNode.replaceChildren();
      if (!messages.length) {
        var welcome = element("div", "message");
        welcome.appendChild(element("p", "bubble", config && config.mode === "general" ? "Hi! What would you like to ask?" : "Hi! Ask me about this website."));
        messagesNode.appendChild(welcome);
      }
      messages.forEach(function (item) {
        var row = element("div", "message " + (item.role === "user" ? "user" : "assistant"));
        row.appendChild(element("p", "bubble", item.content));
        if (item.sources && item.sources.length) row.appendChild(element("p", "source-list", "Sources: " + item.sources.join(", ")));
        messagesNode.appendChild(row);
      });
      messagesNode.scrollTop = messagesNode.scrollHeight;
    }

    function openPanel() {
      if (open) return;
      open = true;
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      if (config && config.mascotMode !== "standard") anchorCorner();
      placePanel();
      input.focus();
    }
    function closePanel() {
      open = false;
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }

    function spriteFrame(name) {
      if (!mascotNode || !config || config.assetType !== "sprite") return;
      var frame = config.spriteFrames[name] || config.spriteFrames.idle || [0, 0];
      var columns = config.spriteColumns || 1;
      var rows = config.spriteRows || 1;
      var x = columns <= 1 ? 0 : frame[0] * 100 / (columns - 1);
      var y = rows <= 1 ? 0 : frame[1] * 100 / (rows - 1);
      mascotNode.style.backgroundPosition = x + "% " + y + "%";
    }

    function configureLauncher(next) {
      config = next;
      shadow.host.style.setProperty("--accent", /^#[0-9a-fA-F]{6}$/.test(config.accentColor) ? config.accentColor : "#2f5bff");
      title.textContent = config.name || "Website chat";
      subtitle.textContent = config.mode === "general" ? "General questions" : "Answers from this website";
      launcher.replaceChildren();
      mascotNode = null;
      var standard = config.mascotMode === "standard" || (config.mascotMode === "custom" && !config.assetUrl);
      launcher.classList.toggle("standard", standard);
      if (standard) {
        launcher.innerHTML = icon("chat");
        launcher.style.width = "58px";
        launcher.style.height = "58px";
      } else if (config.assetType === "static") {
        mascotNode = element("img", "mascot static");
        mascotNode.alt = "";
        mascotNode.src = config.assetUrl;
        launcher.appendChild(mascotNode);
        launcher.style.width = "88px";
        launcher.style.height = "88px";
      } else {
        mascotNode = element("span", "mascot");
        mascotNode.style.backgroundImage = 'url("' + String(config.assetUrl).replace(/"/g, "%22") + '")';
        mascotNode.style.backgroundSize = (config.spriteColumns * 100) + "% " + (config.spriteRows * 100) + "%";
        launcher.appendChild(mascotNode);
        launcher.style.width = window.innerWidth <= 640 ? "64px" : window.innerWidth <= 900 ? "78px" : "96px";
        launcher.style.height = window.innerWidth <= 640 ? "86px" : window.innerWidth <= 900 ? "104px" : "128px";
        spriteFrame("idle");
        if (config.mascotMode === "custom") {
          var sizingImage = new Image();
          sizingImage.onload = function () {
            if (destroyed || !mascotNode) return;
            var frameRatio = (sizingImage.naturalHeight / config.spriteRows) / (sizingImage.naturalWidth / config.spriteColumns);
            var width = window.innerWidth <= 640 ? 64 : 96;
            var height = clamp(Math.round(width * frameRatio), 48, 144);
            launcher.style.width = width + "px";
            launcher.style.height = height + "px";
            anchorCorner();
          };
          sizingImage.src = config.assetUrl;
        }
      }
      launcher.setAttribute("aria-label", standard ? "Open chat" : "Open chat or drag mascot to move it");
      anchorCorner();
      renderMessages();
    }

    function safeDestination() {
      var width = launcher.offsetWidth;
      var height = launcher.offsetHeight;
      var blockers = Array.from(document.querySelectorAll("nav, form, dialog[open], [role='dialog'][aria-modal='true'], [data-smokey-exclusion]"))
        .filter(function (node) { return !host.contains(node); })
        .map(function (node) { return node.getBoundingClientRect(); });
      for (var i = 0; i < 16; i++) {
        var x = 12 + Math.random() * Math.max(0, window.innerWidth - width - 24);
        var y = Math.max(12, window.innerHeight * .5) + Math.random() * Math.max(0, window.innerHeight * .5 - height - 24);
        var blocked = blockers.some(function (rect) { return x < rect.right + 12 && x + width > rect.left - 12 && y < rect.bottom + 12 && y + height > rect.top - 12; });
        if (!blocked) return { x: x, y: y };
      }
      return null;
    }

    function startRoaming() {
      clearInterval(roamTimer);
      roamTimer = setInterval(function () {
        if (destroyed || open || !config || config.mascotMode === "standard" || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (document.querySelector("dialog[open], [role='dialog'][aria-modal='true']")) return;
        if (mascotNode && config.assetType === "sprite" && Math.random() < .12) {
          spriteFrame("sleep");
          setTimeout(function () { if (!destroyed && !open) spriteFrame("idle"); }, 1800);
          return;
        }
        if (!config.roaming || window.innerWidth <= 640) return;
        var destination = safeDestination();
        if (!destination) return;
        if (mascotNode && config.assetType === "sprite") {
          frameIndex = 0;
          clearInterval(walkTimer);
          walkTimer = setInterval(function () { spriteFrame(frameIndex++ % 2 ? "walk1" : "walk2"); }, 220);
          setTimeout(function () { clearInterval(walkTimer); spriteFrame("idle"); }, 1950);
        }
        setPosition(destination.x, destination.y, false);
      }, 9500);
    }

    function onPointerDown(event) {
      if (!config || config.mascotMode === "standard" || (event.pointerType === "mouse" && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
      moved = false;
      launcher.setPointerCapture(event.pointerId);
      launcher.classList.add("dragging");
    }
    function onPointerMove(event) {
      if (!drag || event.pointerId !== drag.id) return;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) moved = true;
      if (moved) setPosition(drag.startX + dx, drag.startY + dy, true);
    }
    function onPointerUp(event) {
      if (!drag || event.pointerId !== drag.id) return;
      if (launcher.hasPointerCapture(event.pointerId)) launcher.releasePointerCapture(event.pointerId);
      drag = null;
      launcher.classList.remove("dragging");
    }
    function onClick(event) {
      if (moved) { event.preventDefault(); moved = false; return; }
      if (open) closePanel(); else openPanel();
    }
    function onResize() {
      if (!config) return;
      if (window.innerWidth <= 640 || config.mascotMode === "standard") anchorCorner();
      else setPosition(position.x, position.y, true);
      if (open) placePanel();
    }
    function onKeyDown(event) { if (event.key === "Escape" && open) closePanel(); }

    launcher.addEventListener("pointerdown", onPointerDown);
    launcher.addEventListener("pointermove", onPointerMove);
    launcher.addEventListener("pointerup", onPointerUp);
    launcher.addEventListener("pointercancel", onPointerUp);
    launcher.addEventListener("click", onClick);
    close.addEventListener("click", closePanel);
    clear.addEventListener("click", function () { messages = []; saveSession(storageKey, messages); renderMessages(); input.focus(); });
    window.addEventListener("resize", onResize);
    shadow.addEventListener("keydown", onKeyDown);
    composer.addEventListener("submit", async function (event) {
      event.preventDefault();
      var question = input.value.trim();
      if (!question || busy) return;
      var history = messages.slice(-10).map(function (item) { return { role: item.role, content: item.content }; });
      messages.push({ role: "user", content: question });
      saveSession(storageKey, messages);
      renderMessages();
      input.value = "";
      busy = true;
      send.disabled = true;
      status.textContent = "Thinking…";
      if (mascotNode && config && config.assetType === "sprite") spriteFrame("speak");
      try {
        var response = await fetch(apiBaseUrl + "/api/widget/" + encodeURIComponent(siteId) + "/chat", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, history: history })
        });
        var data = await response.json();
        if (!response.ok) throw new Error(data.error || "Chat is unavailable. Please try again.");
        messages.push({ role: "assistant", content: data.answer, sources: data.sources || [] });
        saveSession(storageKey, messages);
        renderMessages();
        status.textContent = "";
      } catch (error) {
        messages.pop();
        saveSession(storageKey, messages);
        renderMessages();
        status.textContent = error.message || "Chat is unavailable. Please try again.";
        input.value = question;
      } finally {
        busy = false;
        send.disabled = false;
        if (mascotNode && config && config.assetType === "sprite") spriteFrame("idle");
      }
    });

    anchorCorner();
    renderMessages();
    fetch(apiBaseUrl + "/api/widget/" + encodeURIComponent(siteId) + "/config")
      .then(function (response) { if (!response.ok) throw new Error("Chatbot configuration could not be loaded."); return response.json(); })
      .then(function (data) { if (!destroyed) { configureLauncher(data); startRoaming(); } })
      .catch(function (error) { status.textContent = error.message; });

    return {
      open: openPanel,
      close: closePanel,
      destroy: function () {
        destroyed = true;
        clearInterval(roamTimer);
        clearInterval(walkTimer);
        window.removeEventListener("resize", onResize);
        host.remove();
      }
    };
  }

  window.SmokeyChatBot = { mount: mountSmokeyChatBot };
  var script = document.currentScript;
  if (script && script.dataset.siteId && script.dataset.apiBaseUrl) {
    var start = function () { mountSmokeyChatBot({ siteId: script.dataset.siteId, apiBaseUrl: script.dataset.apiBaseUrl }); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})();
