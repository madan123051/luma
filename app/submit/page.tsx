import type { Metadata } from "next";
import { SubmitStudio } from "./submit-studio";

export const metadata: Metadata = {
  title: "Share your work",
  description: "Submit photography for review by the LUMA by WildSaura editorial team.",
};

export default function SubmitPage() {
  return <SubmitStudio />;
}
