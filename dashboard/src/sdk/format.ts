export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
export const display = (value: unknown) =>
  value == null
    ? "Unknown"
    : typeof value === "object"
      ? JSON.stringify(value)
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
