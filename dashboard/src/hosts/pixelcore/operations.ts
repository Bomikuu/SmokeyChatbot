import type { SmokeyRequest } from "@/sdk/contracts";
import { SmokeyAdapterError } from "@/sdk/errors";
const uuid = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    throw new SmokeyAdapterError("INVALID_PARAMETER", "Invalid resource identifier.");
  return value;
};
export const pixelCoreOperation = (request: SmokeyRequest) => {
  const { operation, identity, params = {} } = request;
  const business = "businesses/" + uuid(identity.organizationId) + "/";
  const root = business + "smokey/";
  const connection = () => "connections/" + uuid(params.connectionId) + "/";
  const generation = () => "generations/" + uuid(params.generationId) + "/";
  const report = () => "reports/" + uuid(params.reportId) + "/";
  const table = () => {
    if (typeof params.tableKey !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(params.tableKey))
      throw new SmokeyAdapterError("INVALID_PARAMETER", "Invalid report table.");
    return params.tableKey;
  };
  let path: string,
    method = "GET",
    body = request.body;
  switch (operation) {
    case "integration.get":
      return { path: business + "smokey-integration/", method };
    case "module.enable":
      return {
        path: business + "capabilities/smokey/",
        method: "PATCH",
        body: { status: "active" },
      };
    case "settings.get":
      path = "settings/";
      break;
    case "settings.update":
      path = "settings/";
      method = "PATCH";
      break;
    case "connections.list":
      path = "connections/";
      break;
    case "connections.create":
      path = "connections/";
      method = "POST";
      break;
    case "connections.update":
      path = connection();
      method = "PATCH";
      break;
    case "connections.delete":
      path = connection();
      method = "DELETE";
      break;
    case "connections.models":
      path = connection() + "models/";
      break;
    case "connections.check":
      path = connection() + "check/";
      method = "POST";
      break;
    case "models.discover":
      path = "models/";
      method = "POST";
      break;
    case "generations.create":
      path = "generations/";
      method = "POST";
      break;
    case "generations.get":
      path = generation();
      break;
    case "generations.cancel":
      path = generation() + "cancel/";
      method = "POST";
      break;
    case "reports.list":
      path = "reports/";
      break;
    case "reports.get":
      path = report();
      break;
    case "reports.delete":
      path = report();
      method = "DELETE";
      break;
    case "reports.rows":
      path = report() + "tables/" + table() + "/";
      break;
    case "usage.get":
      path = "usage/";
      break;
    case "asset.get":
      path = "asset/";
      break;
    case "asset.upload":
      path = "asset/";
      method = "POST";
      break;
    default:
      throw new SmokeyAdapterError("INVALID_OPERATION", "Unsupported assistant operation.");
  }
  const query = new URLSearchParams();
  if (operation === "reports.rows") {
    if (params.page_size !== undefined) {
      const size = String(params.page_size);
      if (!["20", "50", "100"].includes(size))
        throw new SmokeyAdapterError("INVALID_PARAMETER", "Invalid report page size.");
      query.set("page_size", size);
    }
    if (params.search !== undefined) {
      if (typeof params.search !== "string" || params.search.length > 100)
        throw new SmokeyAdapterError("INVALID_PARAMETER", "Search must be at most 100 characters.");
      query.set("search", params.search);
    }
  }
  for (const key of ["offset", "date_from", "date_to"])
    if (params[key] !== undefined) {
      const value = String(params[key]);
      if (key === "offset" ? !/^\d+$/.test(value) : !/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new SmokeyAdapterError("INVALID_PARAMETER", "Invalid report range.");
      query.set(key, value);
    }
  return { path: root + path + (query.size ? "?" + query : ""), method, body };
};
