import EditProductClient from './EditProductClient';

// Required for static export: one placeholder path; real IDs work via _redirects rewrite + client useParams()
export function generateStaticParams() {
  return [{ id: 'edit' }];
}

export default function EditProductPage() {
  return <EditProductClient />;
}
