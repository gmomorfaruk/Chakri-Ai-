import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPortfolioView } from "@/components/portfolio/PublicPortfolioView";
import { getPublicPortfolioByUsername } from "@/lib/portfolioService";

type PortfolioPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicPortfolioByUsername(username);

  if (!data) {
    return {
      title: "Portfolio Not Found | Chakri AI",
      description: "This portfolio is private or unavailable.",
    };
  }

  const displayName = data.profile.full_name ?? data.profile.username ?? "Portfolio";
  const description = data.profile.bio ?? `Professional portfolio of ${displayName} on Chakri AI.`;

  return {
    title: `${displayName} | Chakri AI Portfolio`,
    description,
    openGraph: {
      title: `${displayName} | Chakri AI Portfolio`,
      description,
      type: "profile",
    },
  };
}

export default async function PublicPortfolioPage({ params }: PortfolioPageProps) {
  const { username } = await params;
  const data = await getPublicPortfolioByUsername(username);

  if (!data) {
    notFound();
  }

  return <PublicPortfolioView data={data} />;
}
