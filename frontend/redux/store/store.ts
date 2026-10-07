import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "../features/api/baseApi";
import authReducer from "../features/slice/authSlice";
import notificationReducer from "../features/slice/notificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notification: notificationReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
