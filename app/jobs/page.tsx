import { JobHubModule } from "@/components/jobs/JobHubModule";

export const metadata = {
  title: "Jobs | Chakri AI",
  description: "Browse approved jobs from the Chakri AI community.",
};

export default async function PublicJobsPage() {
  return <JobHubModule />;
}
