import { redirect } from 'next/navigation';

export default async function StockBatchRedirectPage({
  params,
}: {
  params: Promise<{ batch: string }>;
}) {
  const { batch } = await params;
  redirect(`/app/store/${batch}`);
}
