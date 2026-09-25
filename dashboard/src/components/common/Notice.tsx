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
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-blue-200 bg-blue-50 text-[#2149dc]"
      }`}
    >
      {message}
    </p>
  );
};
