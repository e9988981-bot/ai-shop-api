import { useParams } from 'react-router-dom';

export default function ProductEdit() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Product {id}</h1>
      <p className="text-gray-500">แก้ไขสินค้า — เปิดจาก Worker /admin/products/:id</p>
    </div>
  );
}
