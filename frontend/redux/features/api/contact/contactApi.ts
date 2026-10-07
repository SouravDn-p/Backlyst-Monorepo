import { ContactFormPayload, ContactFormResponse } from "@/types/contact/contactTypes";
import { baseApi } from "../baseApi";

const contactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitContactForm: build.mutation<ContactFormResponse, ContactFormPayload>({
      query: (payload) => ({
        url: "/contact",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Contact"],
    }),
  }),
});

export const {useSubmitContactFormMutation} = contactApi;