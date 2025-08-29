import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Cryptic Cabin Leagues</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Tabletop games and TCG leagues at Cryptic Cabin stores.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a 
                  href="https://crypticcabin.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-200"
                >
                  Main Store
                </a>
              </li>
              <li>
                <a 
                  href="https://crypticcabin.com/pages/events" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-200"
                >
                  Store Events
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Support</h3>
            <a 
              href="mailto:contact@crypticcabin.com" 
              className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Report Bug / Contact
            </a>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-6 pt-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Cryptic Cabin Leagues. Part of the{' '}
            <a 
              href="https://crypticcabin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 transition-colors duration-200"
            >
              Cryptic Cabin
            </a>
            {' '}family.
          </p>
        </div>
      </div>
    </footer>
  );
}