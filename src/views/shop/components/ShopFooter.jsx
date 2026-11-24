import { Link } from 'react-router-dom'

export default function ShopFooter() {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200">
      {/* Main Footer Links */}
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-xs">
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
