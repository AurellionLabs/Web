import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-black text-gray-400 border-t border-gray-700/50">
      <div className="container mx-auto px-4 max-w-7xl flex flex-col sm:flex-row justify-between items-center text-sm">
        <div>
          <p>&copy; {currentYear} Aurellion Labs. All rights reserved.</p>
        </div>
        <div className="flex space-x-4 mt-4 sm:mt-0">
          {/* Themed link hover */}
          <a
            href="#"
            className="hover:text-amber-400 transition-colors duration-300"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="hover:text-amber-400 transition-colors duration-300"
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="hover:text-amber-400 transition-colors duration-300"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
