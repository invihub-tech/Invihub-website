import { ShieldCheck, Headphones, Truck, CreditCard, Sparkles, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ADMIN_KEY } from '../../../config/adminPath'

export default function ShopFooter() {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200">
      {/* Why Choose INVIHUB Section */}
      <div className="bg-slate-50 border-b border-slate-200 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#f97316]">
              Trusted by 10,000+ Makers & Engineers
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              Why Choose INVIHUB?
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Every printer, filament spool, and circuit board in our store is quality-tested in our Bangalore engineering lab.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-orange-50 text-[#f97316] flex items-center justify-center shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Lab Tested Quality</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tested and calibrated in-house before packaging for zero-defect printing.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Headphones size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Expert Maker Support</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Direct engineering assistance with slicer profiles, firmware, and wiring.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Truck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Pan India Delivery</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fast dispatch within 24 hours. Free shipping on all orders above ₹999.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">100% Secure Payments</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Protected with 256-bit encryption. Supports UPI, NetBanking, Cards & COD.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs">
          {/* Brand info */}
          <div className="col-span-2">
            <Link to="/shop" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center p-1">
                <img src="/images/logo.png" alt="INVIHUB" className="w-full h-full object-contain filter invert" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">INVIHUB Shop</span>
            </Link>
            <p className="text-slate-500 mt-3 max-w-sm text-xs leading-relaxed">
              India's premier engineering marketplace for 3D printers, precision filaments, robotics kits, and electronics components.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Accepted Payments:</span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                UPI / GPay / PhonePe
              </span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Razorpay
              </span>
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Cards
              </span>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Catalogue</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/shop/products?q=3D+Printer" className="hover:text-[#f97316] transition-colors">
                  3D Printers
                </Link>
              </li>
              <li>
                <Link to="/shop/products?q=Filament" className="hover:text-[#f97316] transition-colors">
                  PLA & PETG Filaments
                </Link>
              </li>
              <li>
                <Link to="/shop/products?q=Electronics" className="hover:text-[#f97316] transition-colors">
                  Development Boards
                </Link>
              </li>
              <li>
                <Link to="/shop/products?q=Hardware" className="hover:text-[#f97316] transition-colors">
                  Motors & Bearings
                </Link>
              </li>
              <li>
                <Link to="/shop/products?deals=1" className="text-red-600 font-semibold hover:underline">
                  Special Clearance Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Customer Care</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/shop/account" className="hover:text-[#f97316] transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/shop/account" className="hover:text-[#f97316] transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to="/#contact" className="hover:text-[#f97316] transition-colors">
                  Contact Technical Support
                </Link>
              </li>
              <li>
                <Link to="/#about" className="hover:text-[#f97316] transition-colors">
                  Custom Job Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Engineering Lab */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">Company</h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/" className="hover:text-[#f97316] transition-colors">
                  Main INVIHUB Website
                </Link>
              </li>
              <li>
                <Link to="/#work" className="hover:text-[#f97316] transition-colors">
                  Our Engineering Work
                </Link>
              </li>
              <li>
                <Link to={`/${ADMIN_KEY}/admin`} className="hover:text-slate-900 transition-colors text-slate-400">
                  Staff Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} INVIHUB Technologies. All rights reserved. INTERACT &gt;&gt; INNOVATE &gt;&gt; INSPIRE.</p>
          <div className="flex items-center gap-4">
            <Link to="/shop" className="hover:text-slate-600">Privacy Policy</Link>
            <span>•</span>
            <Link to="/shop" className="hover:text-slate-600">Terms of Service</Link>
            <span>•</span>
            <Link to="/shop" className="hover:text-slate-600">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
