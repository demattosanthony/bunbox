import { redirect } from "@ademattos/bunbox/client";

export default function DocsPage() {
  // Redirect to the introduction page
  redirect("/docs/introduction");

  return null;
}
