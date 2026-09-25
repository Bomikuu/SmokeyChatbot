export const errorMessage = (issue: unknown) =>
  issue instanceof Error ? issue.message : "Something went wrong. Please try again.";
