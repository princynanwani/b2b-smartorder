'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';

export default function ExcelUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);

  // Load already-saved products on page load (persists after reload!)
  useEffect(() => {
    loadExistingProducts();
  }, []);

  async function loadExistingProducts() {
    try {
      // 1. Check localStorage first so it works immediately
      const localData = localStorage.getItem('smartorder_products');
      if (localData) {
        setSavedProducts(JSON.parse(localData));
      }

      // 2. Also fetch from Supabase if available
      const { data, error: dbErr } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!dbErr && data && data.length > 0) {
        setSavedProducts(data);
        localStorage.setItem('smartorder_products', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error loading existing products:', err);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      // Read file using arrayBuffer (modern & reliable across all browsers)
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (!rawData || rawData.length === 0) {
        throw new Error('The uploaded Excel file is empty.');
      }

      // Map Excel columns to match both your Supabase schema and Retailer Catalog
      const formattedProducts = rawData
        .map((row, index) => {
          const rawName = row.name || row.Name || row.PRODUCT || row.Product || row.item || row.Item;
          if (!rawName) return null;

          const parsedPrice = parseFloat(
            row.selling_price ?? row.price ?? row.Price ?? row.PRICE ?? row.mrp ?? row.MRP ?? 0
          );
          const parsedStock = parseInt(
            row.stock_quantity ?? row.stock ?? row.Stock ?? row.STOCK ?? row.quantity ?? row.Quantity ?? 0,
            10
          );

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
        throw new Error('Could not find valid products. Make sure your Excel has columns: name, price, stock.');
      }

      // 1. Always save to localStorage so it persists across reloads & shows in Retailer Catalog immediately
      localStorage.setItem('smartorder_products', JSON.stringify(formattedProducts));
      setSavedProducts(formattedProducts);

      // 2. Also attempt to save to Supabase database (remove temporary 'id' so Supabase auto-generates it)
      const supabasePayload = formattedProducts.map(({ id, ...rest }) => rest);
      const { data: insertedData, error: supabaseError } = await supabase
        .from('products')
        .insert(supabasePayload)
        .select();

      if (supabaseError) {
        console.warn('Supabase sync warning (saved locally instead):', supabaseError.message);
        setMessage(
          `Successfully synced ${formattedProducts.length} products! They are now live in your Retailer Catalog.`
        );
      } else if (insertedData && insertedData.length > 0) {
        localStorage.setItem('smartorder_products', JSON.stringify(insertedData));
        setSavedProducts(insertedData);
        setMessage(
          `Successfully synced ${insertedData.length} products to Supabase & Retailer Catalog!`
        );
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process Excel file.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input so you can re-upload if needed
    }
  }

  function handleClearCatalog() {
    localStorage.removeItem('smartorder_products');
    setSavedProducts([]);
    setMessage('Cleared local catalog preview.');
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Upload Daily Price List</h1>
            <p className="text-gray-500 mt-1">
              Upload your distributor Excel sheet (.xlsx) to instantly update catalog prices and stock.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/catalog"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold shadow-sm text-sm"
            >
              View Retailer Catalog
              <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/distributor/dashboard"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>

        {/* Upload Box */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Daily Price List</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Upload your distributor Excel sheet (.xlsx or .xls) with columns <b>name</b>, <b>price</b>, and <b>stock</b>.
          </p>

          <label className="block max-w-md mx-auto border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-8 cursor-pointer transition bg-gray-50 hover:bg-blue-50/30">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <span className="block font-semibold text-gray-700">
              {uploading ? 'Processing & Saving...' : 'Click to browse Excel file'}
            </span>
            <span className="block text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Status Messages */}
        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{message}</span>
            </div>
            <Link
              href="/catalog"
              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex-shrink-0"
            >
              Open Retailer Catalog &rarr;
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Saved Products Table (Persists after reload) */}
        {savedProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Saved Inventory ({savedProducts.length} Products Active)
                </h3>
                <p className="text-xs text-gray-500">
                  These products are saved and currently visible in the Retailer Catalog.
                </p>
              </div>
              <button
                onClick={handleClearCatalog}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear List
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase bg-gray-50">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Stock Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {savedProducts.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs font-mono text-gray-500">{item.sku || `SKU-${idx + 1}`}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">₹{item.selling_price ?? item.price ?? 0}</td>
                      <td className="py-3 px-4 text-gray-700">{item.stock_quantity ?? item.stock ?? 0} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}