import { redirect } from "next/navigation";

export default function JobTrackerRedirect() {
  redirect("/dashboard/jobs?tab=tracker");
}
