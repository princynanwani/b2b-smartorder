'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ExcelUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel columns to match your Supabase products table schema
        // Expecting Excel headers: Name, Category, Unit, Price, Stock
        const formattedProducts = rawData.map((row) => ({
          name: row['Name'] || row['Product Name'] || 'Unnamed Product',
          category: row['Category'] || 'General',
          unit: row['Unit'] || 'Piece',
          base_price: parseFloat(row['Price'] || row['Base Price'] || 0),
          stock_quantity: parseInt(row['Stock'] || row['Quantity'] || 100),
        }));

        // Upsert into Supabase (updates existing products by name or inserts new ones)
        const { error: dbError } = await supabase
          .from('products')
          .upsert(formattedProducts, { onConflict: 'name' });

        if (dbError) throw dbError;

        setMessage(`Successfully imported ${formattedProducts.length} products from Excel!`);
      } catch (err) {
        setError('Failed to process Excel file: ' + err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Upload Daily Price List</h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload your distributor Excel sheet (.xlsx) to instantly update catalog prices.
        </p>

        {/* File Input Box */}
        <label className="border-2 border-dashed border-gray-200 hover:border-blue-500 transition rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50">
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700">
            {uploading ? 'Processing sheet...' : 'Click to browse Excel file'}
          </span>
          <span className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls</span>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>

        {/* Feedback Messages */}
        {message && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
