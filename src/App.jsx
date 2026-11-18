import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext.jsx";
import { WishlistProvider } from "./context/WishlistContext";

import AdminRoute from "./components/AdminRoute";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import AdminPage from "./pages/Admin.jsx";
import Arrivals from "./pages/Arrivals.jsx";
import Authentication from "./pages/Authentication.jsx";
import Cart from "./pages/Cart.jsx";
import Category from "./pages/Category.jsx";
import Checkout from "./pages/Checkout.jsx";
import Collections from "./pages/Collections.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail.jsx";
import Products from "./pages/Products.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import Contact from "./pages/Contact.jsx";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return;
  }

  const isAdmin = user?.is_staff || user?.is_superuser;

  if (isAdmin) {
    return (
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="*" element={<AdminPage />} />
        </Route>
      </Routes>
    );
  }

  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Authentication />} />
        <Route path="/categories" element={<Category />} />
        <Route path="/arrivals" element={<Arrivals />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/categories/:slug" element={<Products />} />
        <Route path="/:categorySlug/:slug" element={<ProductDetail />} />

        <Route path="/orders" element={<OrderDetail />} />

        <Route path="/admin/*" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
