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

export const isDeadlinePassed = (value) => {
  if (!value) {
    return false;
  }

  const parsedDate = new Date(value.includes("T") ? value : `${value}T23:59`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.getTime() < Date.now();
};

export const isRecentlyUpdated = (value, hours = 48) => {
  if (!value) {
    return false;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const maxAge = hours * 60 * 60 * 1000;
  return Date.now() - parsedDate.getTime() <= maxAge;
};
