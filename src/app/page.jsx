import Link from 'next/link';
import { Store, Truck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          SmartOrder B2B
        </h1>
        <p className="text-lg text-gray-600">
          Select your portal to continue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Customer Portal Card */}
        <Link 
          href="/catalog"
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition group text-center"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Retailer Portal</h2>
          <p className="text-gray-500">
            Browse the wholesale catalog and place bulk orders instantly.
          </p>
        </Link>

        {/* Distributor Portal Card */}
        <Link 
          href="/distributor/dashboard"
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition group text-center"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Distributor Portal</h2>
          <p className="text-gray-500">
            Manage live orders, sync inventory, and view your retail network.
          </p>
        </Link>
      </div>
    </div>
  );
}