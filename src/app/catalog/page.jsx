'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShoppingBag, Search, CheckCircle2, X, AlertCircle, Trash2 } from 'lucide-react';

export default function RetailerCatalog() {
  const [products, setProducts] = useState([]);
  // Tracks what the user is currently typing in each input box (persists across searches)
  const [draftQuantities, setDraftQuantities] = useState({});
  // Tracks validation error messages per product ID
  const [validationErrors, setValidationErrors] = useState({});
  // Tracks confirmed items added to the cart: { [productId]: quantity }
  const [cart, setCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const customerId = 1; // Testing customer ID

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Helper to check if a product unit allows decimals (e.g., kg, liter, gram)
  const allowsDecimals = (unit = '') => {
    const u = unit.toLowerCase();
    return u.includes('kg') || u.includes('kilo') || u.includes('ltr') || u.includes('liter') || u.includes('gm');
  };

  // Validate quantity against stock, MOQ, and multiples
  const validateQuantity = (product, rawValue) => {
    if (rawValue === '' || rawValue === undefined) return null;

    const isDecimal = allowsDecimals(product.unit);
    const num = isDecimal ? parseFloat(rawValue) : parseInt(rawValue, 10);
    const stock = product.stock_quantity ?? 0;
    const minOrder = product.min_order_qty ?? 1;
    const multiple = product.order_multiple ?? 1;

    if (isNaN(num) || num <= 0) {
      return 'Enter a valid positive number.';
    }
    if (!isDecimal && !Number.isInteger(Number(rawValue))) {
      return 'Whole numbers only for this unit.';
    }
    if (num > stock) {
      return `Exceeds stock! Max available: ${stock}`;
    }
    if (num < minOrder) {
      return `Minimum order quantity is ${minOrder}.`;
    }
    if (multiple > 1 && num % multiple !== 0) {
      return `Must be ordered in multiples of ${multiple}.`;
    }
    return null;
  };

  // Handle manual typing in the quantity field
  const handleQuantityChange = (product, value) => {
    // Allow empty string so user can backspace/clear
    if (value === '') {
      setDraftQuantities((prev) => ({ ...prev, [product.id]: '' }));
      setValidationErrors((prev) => ({ ...prev, [product.id]: null }));
      return;
    }

    // Regex filter: digits and optional single decimal point if allowed
    const isDecimal = allowsDecimals(product.unit);
    const validPattern = isDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (!validPattern.test(value)) return;

    setDraftQuantities((prev) => ({ ...prev, [product.id]: value }));

    const errorMsg = validateQuantity(product, value);
    setValidationErrors((prev) => ({ ...prev, [product.id]: errorMsg }));
  };

  // Clear/Reset input field and remove from cart if present
  const clearQuantity = (productId) => {
    setDraftQuantities((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Explicitly add or update item in the cart on button click
  const handleAddToCart = (product) => {
    const rawVal = draftQuantities[product.id];
    const errorMsg = validateQuantity(product, rawVal);

    if (!rawVal || errorMsg) {
      setValidationErrors((prev) => ({
        ...prev,
        [product.id]: errorMsg || 'Please enter a quantity first.'
      }));
      return;
    }

    const finalQty = allowsDecimals(product.unit)
      ? parseFloat(rawVal)
      : parseInt(rawVal, 10);

    setCart((prev) => ({
      ...prev,
      [product.id]: finalQty
    }));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate live cart totals
  const cartProductIds = Object.keys(cart);
  const totalSkusInCart = cartProductIds.length;
  const totalUnitsInCart = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartSubtotal = cartProductIds.reduce((sum, id) => {
    const prod = products.find((p) => p.id === parseInt(id, 10));
    return sum + (prod ? prod.base_price * cart[id] : 0);
  }, 0);

  async function submitOrder() {
    if (totalSkusInCart === 0) return;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ customer_id: customerId, status: 'PENDING' }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsData = cartProductIds.map((productId) => {
        const prod = products.find((p) => p.id === parseInt(productId, 10));
        return {
          order_id: orderData.id,
          product_id: parseInt(productId, 10),
          quantity: cart[productId],
          price_at_time: prod?.base_price || 0
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      setOrderPlaced(true);
      setCart({});
      setDraftQuantities({});
      setValidationErrors({});
      setTimeout(() => setOrderPlaced(false), 4000);
    } catch (err) {
      alert('Failed to place order: ' + err.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading wholesale catalog...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Compact Sticky Header */}
      <header className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-20 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📦 Wholesale Fast-Order</h1>
          <p className="text-xs text-gray-500">Type bulk quantities directly using keypad</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500">Cart Subtotal</p>
            <p className="text-sm font-bold text-blue-600">₹{cartSubtotal.toLocaleString('en-IN')}</p>
          </div>
          <div className="relative bg-blue-50 p-2.5 rounded-xl border border-blue-100">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            {totalSkusInCart > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {totalSkusInCart}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-3 bg-white border-b sticky top-[61px] z-10">
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter products by name or category (typed quantities are preserved)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-100 border border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Order Success Banner */}
      {orderPlaced && (
        <div className="max-w-4xl mx-auto mx-4 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">Bulk order submitted! Your distributor has received the order.</p>
        </div>
      )}

      {/* Compact Image-Free Wholesale Table */}
      <main className="max-w-4xl mx-auto p-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header (Hidden on very small screens, shown on tablet/desktop) */}
          <div className="hidden sm:grid sm:grid-cols-12 bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider border-b">
            <div className="col-span-4">Product</div>
            <div className="col-span-2 text-right">Unit Price</div>
            <div className="col-span-2 text-center">Available Stock</div>
            <div className="col-span-2 text-center">Enter Quantity</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const draftVal = draftQuantities[product.id] ?? '';
              const inCartQty = cart[product.id];
              const errorMsg = validationErrors[product.id];
              const isDecimal = allowsDecimals(product.unit);
              const stock = product.stock_quantity ?? 0;
              const isOutOfStock = stock <= 0;

              // Line item subtotal preview based on typed or cart quantity
              const previewQty = draftVal !== '' ? parseFloat(draftVal) || 0 : (inCartQty || 0);
              const lineSubtotal = previewQty * product.base_price;

              return (
                <div
                  key={product.id}
                  className={`p-3 sm:px-4 sm:py-3 transition ${
                    inCartQty ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
                    {/* Column 1: Product Name & Unit */}
                    <div className="sm:col-span-4 flex items-baseline justify-between sm:block">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {product.name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          Unit: {product.unit || 'Piece'}
                          {isDecimal ? ' (Decimals allowed)' : ''}
                        </span>
                      </div>
                      {/* Mobile-only Price & Stock badge */}
                      <div className="sm:hidden text-right">
                        <span className="text-sm font-bold text-blue-600">₹{product.base_price}</span>
                        <span className="block text-[11px] text-gray-500">
                          Stock: {stock}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Unit Price (Desktop) */}
                    <div className="hidden sm:block sm:col-span-2 text-right font-bold text-gray-900 text-sm">
                      ₹{product.base_price}
                    </div>

                    {/* Column 3: Available Stock (Desktop) */}
                    <div className="hidden sm:block sm:col-span-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : stock < 20
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : stock}
                      </span>
                    </div>

                    {/* Column 4: Manual Numeric Keypad Input + Clear Action */}
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode={isDecimal ? 'decimal' : 'numeric'}
                          pattern={isDecimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
                          disabled={isOutOfStock}
                          placeholder={isOutOfStock ? '0' : 'Qty (e.g. 50)'}
                          value={draftVal}
                          onChange={(e) => handleQuantityChange(product, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddToCart(product);
                          }}
                          className={`w-full px-2.5 py-1.5 pr-7 text-sm font-semibold text-center rounded-lg border outline-none transition ${
                            errorMsg
                              ? 'border-red-500 bg-red-50 text-red-900'
                              : inCartQty
                              ? 'border-blue-500 bg-white text-gray-900'
                              : 'border-gray-300 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                          } disabled:bg-gray-100 disabled:text-gray-400`}
                        />
                        {(draftVal !== '' || inCartQty) && (
                          <button
                            type="button"
                            onClick={() => clearQuantity(product.id)}
                            title="Clear quantity"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Column 5: Explicit Add to Cart / Update Button */}
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 mt-1 sm:mt-0">
                      {/* Subtotal Preview on Mobile */}
                      <div className="sm:hidden text-xs text-gray-500">
                        {previewQty > 0 && !errorMsg && (
                          <span>Item Total: <strong className="text-gray-800">₹{lineSubtotal.toLocaleString('en-IN')}</strong></span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock || !!errorMsg || draftVal === ''}
                        onClick={() => handleAddToCart(product)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap ${
                          inCartQty && Number(draftVal) === inCartQty
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none'
                        }`}
                      >
                        {inCartQty
                          ? Number(draftVal) === inCartQty
                            ? `✓ In Cart (${inCartQty})`
                            : 'Update Cart'
                          : 'Add to Cart'}
                      </button>
                    </div>
                  </div>

                  {/* Validation Error or Subtotal Feedback Row */}
                  {(errorMsg || (previewQty > 0 && !errorMsg)) && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      {errorMsg ? (
                        <div className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      ) : (
                        <div className="hidden sm:block text-gray-500">
                          Line Subtotal: <strong className="text-gray-800">₹{lineSubtotal.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Floating Bottom Cart Summary & Submit Bar */}
      {totalSkusInCart > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4 shadow-lg z-30">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {totalSkusInCart} Products ({totalUnitsInCart} total units)
              </p>
              <p className="text-base sm:text-lg font-extrabold text-gray-900">
                Total: ₹{cartSubtotal.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCart({});
                  setDraftQuantities({});
                  setValidationErrors({});
                }}
                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition"
                title="Clear entire cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={submitOrder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition"
              >
                Submit Wholesale Order 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}