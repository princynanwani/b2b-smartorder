'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Truck, Lock, Phone, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

export default function HomeLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null); // 'retailer' | 'distributor'
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, redirect to their allowed portal
    const savedUser = localStorage.getItem('smartorder_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === 'distributor') {
        router.push('/distributor/dashboard');
      } else if (parsed.role === 'retailer') {
        router.push('/catalog');
      }
    }
  }, [router]);

  function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (selectedRole === 'distributor') {
      // Distributor PIN/Password check (Default: admin123)
      if (password !== 'admin123') {
        setError('Invalid Distributor Password! Use: admin123');
        return;
      }

      const userSession = {
        role: 'distributor',
        name: 'Main Wholesale Distributor',
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem('smartorder_user', JSON.stringify(userSession));
      router.push('/distributor/dashboard');
    } else if (selectedRole === 'retailer') {
      if (!shopName.trim() || !phone.trim()) {
        setError('Please enter your Shop Name and Phone Number.');
        return;
      }

      const userSession = {
        role: 'retailer',
        shop_name: shopName.trim(),
        phone: phone.trim(),
        loggedInAt: new Date().toISOString(),
      };
      localStorage.setItem('smartorder_user', JSON.stringify(userSession));
      router.push('/catalog');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-3xl w-full text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">SmartOrder B2B</h1>
        <p className="text-gray-500 mt-2">Select your portal and sign in to continue.</p>
      </div>

      {/* Role Cards */}
      {!selectedRole ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
          {/* Retailer Portal Card */}
          <button
            onClick={() => {
              setSelectedRole('retailer');
              setError('');
            }}
            className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition text-center group cursor-pointer"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition">
              <Store className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login as Retailer</h2>
            <p className="text-gray-500 text-sm">
              Browse the wholesale catalog and place bulk orders instantly.
            </p>
          </button>

          {/* Distributor Portal Card */}
          <button
            onClick={() => {
              setSelectedRole('distributor');
              setError('');
            }}
            className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition text-center group cursor-pointer"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition">
              <Truck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login as Distributor</h2>
            <p className="text-gray-500 text-sm">
              Manage live orders, sync Excel inventory, and view your retail network.
            </p>
          </button>
        </div>
      ) : (
        /* Login Form Modal */
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedRole === 'distributor'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {selectedRole === 'distributor' ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {selectedRole} Login
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedRole === 'distributor'
                    ? 'Protected Admin Access'
                    : 'Enter your shop details to order'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedRole(null);
                setError('');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium underline"
            >
              Change Role
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {selectedRole === 'retailer' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Retail Shop Name
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Sharma General Store"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Distributor Admin Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password (admin123)"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-900"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Demo Password: <span className="font-mono font-semibold text-gray-600">admin123</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition shadow-sm ${
                selectedRole === 'distributor'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <span>Continue as {selectedRole === 'distributor' ? 'Distributor' : 'Retailer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}