'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Package, Clock, Truck, RefreshCw, Store, User, Phone, Plus, Users, ClipboardList 
} from 'lucide-react';

export default function DistributorDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'customers'
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Customer Form State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch all customers first and map them by ID
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: true });

      if (custError) throw custError;
      setCustomers(customersData || []);

      const customerMap = {};
      (customersData || []).forEach((c) => {
        customerMap[c.id] = c;
      });

      // 2. Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // 3. Enrich each order with its items, product info, and customer details
      const enrichedOrders = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select(`
              quantity,
              price_at_time,
              products (
                name,
                unit
              )
            `)
            .eq('order_id', order.id);

          return {
            ...order,
            customer: customerMap[order.customer_id] || null,
            order_items: itemsData || []
          };
        })
      );

      setOrders(enrichedOrders);
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !phone.trim()) return;

    setAddingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            shop_name: shopName.trim(),
            owner_name: ownerName.trim(),
            phone: phone.trim()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setCustomers((prev) => [...prev, data]);
      setShopName('');
      setOwnerName('');
      setPhone('');
    } catch (err) {
      alert('Error adding customer: ' + err.message);
    } finally {
      setAddingCustomer(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-500 font-medium">Loading distributor portal...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💻 Distributor Portal</h1>
          <p className="text-sm text-gray-500">Manage live retail shop orders and buyer directory.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-gray-200/80 p-1 rounded-xl flex items-center text-sm font-semibold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'orders' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Retailers ({customers.length})
            </button>
          </div>

          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-100 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 shadow-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="max-w-5xl mx-auto space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              No incoming orders yet. Place an order from the mobile catalog!
            </div>
          ) : (
            orders.map((order) => {
              const orderTotal = (order.order_items || []).reduce(
                (sum, item) => sum + item.price_at_time * item.quantity,
                0
              );

              const shop = order.customer?.shop_name || order.customer?.name || `Retail Shop #${order.customer_id}`;
              const owner = order.customer?.owner_name || 'Walk-in / Registered Buyer';
              const phoneNum = order.customer?.phone || 'No phone listed';

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
                  {/* Top Bar: Order ID, Status & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                          Order #{order.id}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
                            order.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : order.status === 'PACKED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {order.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                          {order.status === 'PACKED' && <Package className="w-3.5 h-3.5" />}
                          {order.status === 'DISPATCHED' && <Truck className="w-3.5 h-3.5" />}
                          {order.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Retailer Shop Name, Owner Name & Phone Card */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                          <Store className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>{shop}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>Owner: <strong className="text-gray-800">{owner}</strong></span>
                        </div>
                        <a
                          href={`tel:${phoneNum}`}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{phoneNum}</span>
                        </a>
                      </div>
                    </div>

                    {/* Status Update Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PENDING')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          order.status === 'PENDING'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PACKED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          order.status === 'PACKED'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Packed
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'DISPATCHED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          order.status === 'DISPATCHED'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Dispatched
                      </button>
                    </div>
                  </div>

                  {/* Ordered Items Table */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Ordered Items ({order.order_items?.length || 0})
                      </h4>
                      <span className="text-sm font-extrabold text-gray-900">
                        Order Total: ₹{orderTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-200/60">
                      {order.order_items?.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-800">
                            {item.products?.name || 'Product'}{' '}
                            <span className="text-xs text-gray-400">({item.products?.unit})</span>
                          </span>
                          <div className="flex items-center gap-6">
                            <span className="text-gray-600 font-semibold">
                              Qty: {item.quantity} × ₹{item.price_at_time}
                            </span>
                            <span className="text-gray-900 font-bold w-20 text-right">
                              ₹{(item.price_at_time * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: RETAIL CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add New Retailer Form */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm h-fit">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Add Retail Customer
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Register a local retail shop in your wholesale directory.
            </p>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laxmi Provision Store"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Gupta"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9829012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={addingCustomer}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
              >
                {addingCustomer ? 'Saving...' : 'Save Retail Customer'}
              </button>
            </form>
          </div>

          {/* Registered Retailers List */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Registered Retail Shops ({customers.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No retail customers registered yet.</div>
              ) : (
                customers.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          ID #{c.id}
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {c.shop_name || c.name || 'Unnamed Shop'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Owner: <strong>{c.owner_name || 'N/A'}</strong> • Phone: <strong>{c.phone || 'N/A'}</strong>
                      </p>
                    </div>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}