import { ProductDetailPage } from '@/components/public/ProductDetailPage';

export function generateStaticParams() {
  return [{ slug: 'default' }];
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductDetailPage slug={params.slug} />;
}
