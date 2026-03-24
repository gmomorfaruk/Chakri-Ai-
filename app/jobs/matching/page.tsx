import { redirect } from "next/navigation";

export default function JobMatchingRedirect() {
  redirect("/dashboard/jobs?tab=matching");
}
