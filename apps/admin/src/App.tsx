import { Routes, Route, Navigate } from 'react-router-dom';
import Bootstrap from './pages/Bootstrap';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './components/AdminLayout';
import Shop from './pages/Shop';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Categories from './pages/Categories';
import WaNumbers from './pages/WaNumbers';
import ProductNew from './pages/ProductNew';
import ProductEdit from './pages/ProductEdit';

export default function App() {
  return (
    <Routes>
      <Route path="/bootstrap" element={<Bootstrap />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Shop />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductNew />} />
        <Route path="products/:id" element={<ProductEdit />} />
        <Route path="orders" element={<Orders />} />
        <Route path="categories" element={<Categories />} />
        <Route path="wa-numbers" element={<WaNumbers />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
