export const formatDueDate = (value) => {
  if (!value) return "No deadline";

  const normalizedValue = value.includes("T") ? value : `${value}T23:59`;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
