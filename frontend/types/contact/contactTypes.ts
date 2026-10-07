export interface ContactFormResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    isRead: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ContactFormPayload {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
}