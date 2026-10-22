'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Package, Clock, Truck, RefreshCw, Store, User, 
  Phone, Plus, Users, ClipboardList, FileSpreadsheet, Upload, CheckCircle2, AlertCircle 
} from 'lucide-react';

export default function DistributorDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'customers' | 'upload'
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

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'customers') {
      fetchDashboardData();
    }
  }, [activeTab]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: customersData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .order('id', { ascending: true });

      if (custErr) throw custErr;
      setCustomers(customersData || []);

      const { data: ordersData, error: ordErr } = await supabase
        .from('orders')
        .select('*, customers(shop_name, owner_name, phone)')
        .order('created_at', { ascending: false });

      if (ordErr) throw ordErr;
      setOrders(ordersData || []);
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
      console.error('Error adding customer:', err.message);
      setMessage('Error: ' + err.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadErr('');
    setUploadMsg('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
          throw new Error('The uploaded Excel file is empty.');
        }

        setPreviewData(data.slice(0, 5));

        let successCount = 0;
        for (let row of data) {
          const product = {
            name: row.name || row.Name || row.PRODUCT || row.Product,
            selling_price: parseFloat(row.price || row.Price || row.PRICE || row.selling_price || 0),
            stock_quantity: parseInt(row.stock || row.Stock || row.STOCK || row.quantity || row.stock_quantity || 0),
          };

          if (product.name) {
            const { error: upsertErr } = await supabase
              .from('products')
              .upsert([product], { onConflict: 'name' });

            if (upsertErr) {
              console.error('Supabase upsert error:', upsertErr.message);
            } else {
              successCount++;
            }cd smartorder

          }
        }

        setUploadMsg(`Successfully synced ${successCount} products to Supabase!`);

        setUploadMsg(`Successfully synced ${successCount} products from Excel!`);
      } catch (err) {
        console.error('Upload error:', err);
        setUploadErr('Failed to process Excel file. Make sure columns match product name, price, and stock.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Distributor Portal</h1>
            <p className="text-gray-500 mt-1">Manage incoming retail orders, network inventory, and price sheets.</p>
          </div>
          <Link 
            href="/"
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium self-start md:self-auto shadow-sm"
          >
            Home Portal Selection
          </Link>
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
                        {order.customers?.shop_name || 'Unknown Retailer'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Contact: <span className="font-medium">{order.customers?.owner_name || 'N/A'}</span> ({order.customers?.phone || 'No Phone'})
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
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{uploadMsg}</span>
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
                <h3 className="font-bold text-gray-900 mb-4">Uploaded Price Sheet Preview</h3>
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
                          <td className="py-3 px-3 font-medium text-gray-900">{row.name || row.Name || row.PRODUCT || 'N/A'}</td>
                          <td className="py-3 px-3 text-gray-600">₹{row.price || row.Price || 0}</td>
                          <td className="py-3 px-3 text-gray-600">{row.stock || row.Stock || 0}</td>
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