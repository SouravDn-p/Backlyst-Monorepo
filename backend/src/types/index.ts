export type JwtPayload = {
  id: string;
  email: string;
  role: string;
  sessionId: string;
};

export type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
};
