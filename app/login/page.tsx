import type { Metadata } from "next";
import { LoginGateway } from "./login-gateway";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginGateway />;
}
