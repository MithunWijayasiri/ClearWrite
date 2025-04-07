import React from 'react';

const EXTERNAL_LINKS = {
  GITHUB: 'https://github.com/MithunWijayasiri/ClearWrite',
  PORTFOLIO: 'https://mithun.vercel.app/'
};

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      Made with<a 
        href={EXTERNAL_LINKS.GITHUB}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block relative w-4 h-4 align-text-bottom group mx-1"
      >
        <span className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className="footer-heart">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </span>
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="github-icon" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </span>
      </a>by<a 
        href={EXTERNAL_LINKS.PORTFOLIO}
        target="_blank"
        rel="noopener noreferrer"
        className="author-link ml-1"
      >Mithun Wijayasiri</a>
    </footer>
  );
};

export default Footer; 