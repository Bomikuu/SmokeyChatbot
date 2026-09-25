import "./smokeychatbot.js";

export function mountSmokeyChatBot(options) {
  if (!globalThis.SmokeyChatBot) {
    throw new Error("SmokeyChatBot requires a browser environment.");
  }
  return globalThis.SmokeyChatBot.mount(options);
}
