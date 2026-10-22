'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ShoppingBag, Search, CheckCircle2, AlertCircle, ArrowLeft, Plus, Minus } from 'lucide-react';

export default function RetailerCatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, selling_price, stock_quantity')
        .order('id', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err.message);
      setError('Failed to load catalog products.');
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
    const val = parseInt(value) || 0;
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateSubtotal = () => {
    return products.reduce((total, p) => {
      const qty = quantities[p.id] || 0;
      const price = p.selling_price || 0;
      return total + qty * price;
    }, 0);
  };

  async function handleCheckout() {
    const orderItems = Object.entries(quantities)
      .filter(([id, qty]) => qty > 0)
      .map(([id, qty]) => ({
        product_id: parseInt(id),
        quantity: qty,
      }));

    if (orderItems.length === 0) {
      setError('Please select at least one product quantity to place an order.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      // Assuming customer ID 1 for testing, or fetch dynamically if logged in
      const { error: orderErr } = await supabase.from('orders').insert([
        {
          customer_id: 1, 
          total_amount: calculateSubtotal(),
        },
      ]);

      if (orderErr) throw orderErr;

      setMessage('Order placed successfully! Distributor has been notified.');
      setQuantities({});
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Wholesale Fast-Order</h1>
            <p className="text-gray-500 mt-1">Browse live inventory and place bulk orders directly.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Cart Subtotal</p>
                <p className="text-lg font-extrabold text-gray-900">₹{calculateSubtotal()}</p>
              </div>
            </div>
            <Link 
              href="/"
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Search Bar */}
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
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Product Table / List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading catalog inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No products found</h3>
            <p className="text-gray-500 text-sm">Upload an Excel price list from your distributor portal to populate this catalog.</p>
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="py-4 px-6 font-bold text-gray-900">{product.name}</td>
                    <td className="py-4 px-6 font-semibold text-gray-700">₹{product.selling_price || 0}</td>
                    <td className="py-4 px-6 text-gray-600">{product.stock_quantity || 0} units</td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={quantities[product.id] || 0}
                          onChange={(e) => handleInputChange(product.id, e.target.value)}
                          className="w-16 text-center py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        />
                        <button
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Checkout Button Bar */}
        {filteredProducts.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleCheckout}
              disabled={submitting || calculateSubtotal() === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-sm flex items-center gap-2"
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