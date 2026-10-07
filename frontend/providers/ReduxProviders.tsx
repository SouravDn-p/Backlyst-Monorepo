"use client"

import { Provider } from "react-redux";
import { store } from "@/redux/store/store";
import AuthInitializer from "./AuthInitializer";

export function ReduxProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      {children}
    </Provider>
  );
}
