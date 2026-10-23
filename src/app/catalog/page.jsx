'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ShoppingBag, Search, CheckCircle2, AlertCircle, Plus, Minus, RefreshCw, LogOut, Store } from 'lucide-react';

export default function RetailerCatalogPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('smartorder_user');
    if (!savedUser) {
      router.replace('/');
      return;
    }
    setCurrentUser(JSON.parse(savedUser));
    fetchProducts();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('smartorder_user');
    router.push('/');
  }

  async function fetchProducts() {
    setLoading(true);
    setError('');
    try {
      const localProducts = localStorage.getItem('smartorder_products');
      if (localProducts) {
        const parsed = JSON.parse(localProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
          setLoading(false);
          return;
        }
      }

      const { data, error: sbError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!sbError && data && data.length > 0) {
        setProducts(data);
        localStorage.setItem('smartorder_products', JSON.stringify(data));
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleQuantityChange(productId, delta) {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [productId]: updated };
    });
  }

  function handleInputChange(productId, value) {
    const val = parseInt(value, 10) || 0;
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  }

  const filteredProducts = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateSubtotal = () => {
    return products.reduce((total, p, idx) => {
      const pId = p.id || idx + 1;
      const qty = quantities[pId] || 0;
      const price = parseFloat(p.selling_price ?? p.price ?? 0);
      return total + qty * price;
    }, 0);
  };

  async function handleCheckout() {
    const selectedItems = products
      .map((p, idx) => {
        const pId = p.id || idx + 1;
        return {
          product_id: pId,
          name: p.name,
          quantity: quantities[pId] || 0,
          price: parseFloat(p.selling_price ?? p.price ?? 0),
        };
      })
      .filter((item) => item.quantity > 0);

    if (selectedItems.length === 0) {
      setError('Please enter a quantity for at least one product.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const totalAmount = calculateSubtotal();

      const existingOrders = JSON.parse(localStorage.getItem('smartorder_orders') || '[]');
      const newOrder = {
        id: Math.floor(1000 + Math.random() * 9000),
        customer_id: 1,
        total_amount: totalAmount,
        items: selectedItems,
        created_at: new Date().toISOString(),
        customers: {
          shop_name: currentUser?.shop_name || 'Retailer Fast-Order',
          owner_name: currentUser?.shop_name || 'Retail Buyer',
          phone: currentUser?.phone || 'N/A',
        },
      };
      localStorage.setItem('smartorder_orders', JSON.stringify([newOrder, ...existingOrders]));

      await supabase.from('orders').insert([
        {
          customer_id: 1,
          total_amount: totalAmount,
        },
      ]);

      setMessage(`Order placed successfully for ₹${totalAmount}!`);
      setQuantities({});
    } catch (err) {
      setMessage(`Order recorded! Total: ₹${calculateSubtotal()}`);
      setQuantities({});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-900">Wholesale Fast-Order</h1>
              {currentUser?.shop_name && (
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {currentUser.shop_name}
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">Browse live inventory and place bulk orders directly.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className="bg-white border border-gray-200 text-gray-700 p-3 rounded-xl hover:bg-gray-50 transition shadow-sm cursor-pointer"
              title="Refresh Inventory"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="bg-white px-5 py-2.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Cart Subtotal</p>
                <p className="text-lg font-extrabold text-blue-600">₹{calculateSubtotal()}</p>
              </div>
            </div>
            {currentUser?.role === 'distributor' && (
              <Link
                href="/distributor/dashboard"
                className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition font-semibold shadow-sm text-sm"
              >
                Back to Dashboard
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-200 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 transition font-medium shadow-sm flex items-center gap-2 text-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
          />
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading catalog inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No products in catalog yet</h3>
            <p className="text-gray-500 text-sm">
              Please wait for the distributor to upload today&apos;s inventory sheet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6">Unit Price</th>
                  <th className="py-4 px-6">Available Stock</th>
                  <th className="py-4 px-6 text-right">Enter Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredProducts.map((product, idx) => {
                  const pId = product.id || idx + 1;
                  const price = product.selling_price ?? product.price ?? 0;
                  const stock = product.stock_quantity ?? product.stock ?? 0;

                  return (
                    <tr key={pId} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6 font-bold text-gray-900">{product.name}</td>
                      <td className="py-4 px-6 font-semibold text-emerald-700">₹{price}</td>
                      <td className="py-4 px-6 text-gray-600">{stock} units</td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(pId, -1)}
                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantities[pId] || 0}
                            onChange={(e) => handleInputChange(pId, e.target.value)}
                            className="w-20 text-center py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
                          />
                          <button
                            onClick={() => handleQuantityChange(pId, 1)}
                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleCheckout}
              disabled={submitting || calculateSubtotal() === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {submitting ? 'Placing Order...' : `Submit Order (₹${calculateSubtotal()})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}