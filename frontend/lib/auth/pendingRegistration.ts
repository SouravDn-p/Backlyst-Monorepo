const PENDING_REGISTRATION_KEY = "backlyst.pending-registration";

type PendingRegistration = {
  email: string;
  password: string;
};

export const savePendingRegistration = (credentials: PendingRegistration) => {
  sessionStorage.setItem(
    PENDING_REGISTRATION_KEY,
    JSON.stringify(credentials),
  );
};

export const getPendingRegistration = (): PendingRegistration | null => {
  const value = sessionStorage.getItem(PENDING_REGISTRATION_KEY);

  if (!value) return null;

  try {
    const credentials = JSON.parse(value) as Partial<PendingRegistration>;

    if (
      typeof credentials.email === "string" &&
      typeof credentials.password === "string"
    ) {
      return {
        email: credentials.email,
        password: credentials.password,
      };
    }
  } catch {
    sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
  }

  return null;
};

export const clearPendingRegistration = () => {
  sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
};
