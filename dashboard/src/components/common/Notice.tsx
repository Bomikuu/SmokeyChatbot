interface NoticeProps {
  message: string;
  error?: boolean;
}

export const Notice = ({ message, error = false }: NoticeProps) => {
  if (!message) return null;

  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${
        error
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-accent text-primary"
      }`}
    >
      {message}
    </p>
  );
};
