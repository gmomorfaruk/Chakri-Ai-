import { AdminModule } from "@/components/admin/AdminModule";

type AdminSecretPageProps = {
  params: Promise<{ secret: string }>;
};

export default async function AdminSecretPage({ params }: AdminSecretPageProps) {
  const { secret } = await params;
  return <AdminModule secret={secret} />;
}
