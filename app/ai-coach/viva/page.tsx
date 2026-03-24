import { redirect } from "next/navigation";

export default function VoiceVivaRedirect() {
  redirect("/dashboard/ai?view=voice");
}
