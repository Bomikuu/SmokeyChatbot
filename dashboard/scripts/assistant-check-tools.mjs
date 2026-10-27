import { createServer } from "vite";
export const withModules = async (run) => {
  const server = await createServer({
    server: { middlewareMode: true, watch: null },
    logLevel: "silent",
  });
  try {
    await run((path) => server.ssrLoadModule("/src/" + path));
  } finally {
    await server.close();
  }
};
export const context = (organizationId = "org-a", revision = 1) => ({
  identity: { hostId: "example", organizationId, actorId: "actor-a", revision },
  organization: { name: "Example", timezone: "Asia/Manila" },
  installed: true,
  enabled: true,
  permissions: ["configure", "generate", "view_reports", "delete_reports"],
  reportKinds: ["daily", "sales", "attendance", "late"],
  theme: "light",
});
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
