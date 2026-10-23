'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Package, Clock, Store, Phone, Plus, Users, 
  ClipboardList, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, ExternalLink, LogOut, ShieldAlert 
} from 'lucide-react';

export default function DistributorDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Customer Form State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [message, setMessage] = useState('');

  // Excel Upload State
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [previewData, setPreviewData] = useState([]);

  // Role-Based Route Protection: Block Retailers!
  useEffect(() => {
    const savedUser = localStorage.getItem('smartorder_user');
    if (!savedUser) {
      router.replace('/');
      return;
    }

    const parsed = JSON.parse(savedUser);
    if (parsed.role !== 'distributor') {
      // Retailer is not allowed here! Send them to catalog
      setAuthorized(false);
      setCheckingAuth(false);
      setTimeout(() => {
        router.replace('/catalog');
      }, 2000);
      return;
    }

    setAuthorized(true);
    setCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    fetchDashboardData();
    const saved = localStorage.getItem('smartorder_products');
    if (saved) {
      setPreviewData(JSON.parse(saved));
    }
  }, [activeTab, authorized]);

  function handleLogout() {
    localStorage.removeItem('smartorder_user');
    router.push('/');
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: true });

      setCustomers(customersData || []);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, customers(shop_name, owner_name, phone)')
        .order('created_at', { ascending: false });

      const localOrders = JSON.parse(localStorage.getItem('smartorder_orders') || '[]');
      if (ordersData && ordersData.length > 0) {
        setOrders(ordersData);
      } else {
        setOrders(localOrders);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('customers')
        .insert([{ shop_name: shopName, owner_name: ownerName, phone }]);

      if (error) throw error;

      setMessage('Customer added successfully!');
      setShopName('');
      setOwnerName('');
      setPhone('');
      setAddingCustomer(false);
      fetchDashboardData();
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadErr('');
    setUploadMsg('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        throw new Error('The uploaded Excel file is empty.');
      }

      const formattedProducts = data
        .map((row, index) => {
          const rawName = row.name || row.Name || row.PRODUCT || row.Product;
          if (!rawName) return null;

          const parsedPrice = parseFloat(row.selling_price ?? row.price ?? row.Price ?? row.PRICE ?? 0);
          const parsedStock = parseInt(row.stock_quantity ?? row.stock ?? row.Stock ?? row.STOCK ?? row.quantity ?? 0, 10);

          return {
            id: index + 1,
            sku: String(row.sku || row.SKU || `SKU-${Date.now()}-${index + 1}`),
            name: String(rawName).trim(),
            unit: String(row.unit || row.Unit || 'pcs'),
            selling_price: isNaN(parsedPrice) ? 0 : parsedPrice,
            stock_quantity: isNaN(parsedStock) ? 0 : parsedStock,
            is_active: true
          };
        })
        .filter(Boolean);

      if (formattedProducts.length === 0) {
        throw new Error('No valid products found. Check column names (name, price, stock).');
      }

      localStorage.setItem('smartorder_products', JSON.stringify(formattedProducts));
      setPreviewData(formattedProducts);

      const supabasePayload = formattedProducts.map(({ id, ...rest }) => rest);
      const { data: insertedData, error: sbErr } = await supabase
        .from('products')
        .insert(supabasePayload)
        .select();

      if (!sbErr && insertedData && insertedData.length > 0) {
        localStorage.setItem('smartorder_products', JSON.stringify(insertedData));
        setPreviewData(insertedData);
      }

      setUploadMsg(`Successfully synced ${formattedProducts.length} products from Excel!`);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErr(err.message || 'Failed to process Excel file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
        Verifying Distributor Access...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-sm max-w-md">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-4">
            Retailer accounts cannot access the Distributor Portal. Redirecting you to the Wholesale Catalog...
          </p>
          <Link
            href="/catalog"
            className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
          >
            Go to Retailer Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold text-gray-900">Distributor Portal</h1>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-md">
                ADMIN
              </span>
            </div>
            <p className="text-gray-500 mt-1">Manage incoming retail orders, network inventory, and price sheets.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/catalog"
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm flex items-center gap-2 text-sm"
            >
              Preview Catalog
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="bg-white border border-gray-200 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 transition font-medium shadow-sm flex items-center gap-2 text-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold border-b-2 transition ${
              activeTab === 'customers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-5 h-5" />
            Retailers Network ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-4 px-4 font-semibold border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            Inventory Sync (Excel)
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <div>
            {loading ? (
              <div className="text-center py-20 text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-800">No orders placed yet</h3>
                <p className="text-gray-500 text-sm">Retailer orders will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                          Order #{order.id}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(order.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        {order.customers?.shop_name || 'Retailer Fast-Order'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Contact: <span className="font-medium">{order.customers?.owner_name || 'Retail Buyer'}</span> ({order.customers?.phone || 'N/A'})
                      </p>
                    </div>
                    <div className="text-right w-full md:w-auto bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Amount</p>
                      <p className="text-xl font-extrabold text-gray-900 mt-0.5">₹{order.total_amount || 0}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Retailers */}
        {activeTab === 'customers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Registered Retailers</h2>
              <button
                onClick={() => setAddingCustomer(!addingCustomer)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition font-medium text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {addingCustomer ? 'Cancel' : 'Add Retailer'}
              </button>
            </div>

            {message && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl flex items-center justify-between">
                <span>{message}</span>
                <button onClick={() => setMessage('')} className="text-blue-500 hover:text-blue-700 font-bold">&times;</button>
              </div>
            )}

            {addingCustomer && (
              <form onSubmit={handleAddCustomer} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Shop Name</label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sharma General Store"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition font-medium shadow-sm"
                  >
                    Save Retailer
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers.map((c) => (
                <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md">
                      ID #{c.id}
                    </span>
                    <Store className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{c.shop_name || 'Unnamed Shop'}</h3>
                  <p className="text-sm text-gray-600 mb-4">Owner: <span className="font-semibold">{c.owner_name || 'N/A'}</span></p>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="inline-flex items-center gap-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-xl border border-gray-200 transition font-medium"
                    >
                      <Phone className="w-4 h-4 text-gray-500" />
                      {c.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Excel Upload */}
        {activeTab === 'upload' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center mb-8">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Daily Price List</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                Upload your distributor Excel sheet (.xlsx or .xls) to instantly update catalog prices and stock levels.
              </p>

              <label className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition font-medium cursor-pointer shadow-sm">
                <Upload className="w-5 h-5" />
                {uploading ? 'Processing & Syncing...' : 'Choose Excel File'}
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  disabled={uploading}
                />
              </label>
            </div>

            {uploadMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">{uploadMsg}</span>
                </div>
                <Link
                  href="/catalog"
                  className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  Open Retailer Catalog &rarr;
                </Link>
              </div>
            )}

            {uploadErr && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{uploadErr}</span>
              </div>
            )}

            {previewData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">
                  Active Inventory ({previewData.length} Products Synced)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                        <th className="pb-3 px-3">Product Name</th>
                        <th className="pb-3 px-3">Price</th>
                        <th className="pb-3 px-3">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3 font-medium text-gray-900">{row.name}</td>
                          <td className="py-3 px-3 text-emerald-700 font-semibold">₹{row.selling_price ?? row.price ?? 0}</td>
                          <td className="py-3 px-3 text-gray-600">{row.stock_quantity ?? row.stock ?? 0} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}