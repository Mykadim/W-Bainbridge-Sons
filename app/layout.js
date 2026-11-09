import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata = {
  title: 'Bainbridge Stock · Demo',
  description: 'Stock management demo for W Bainbridge & Sons by Artic Technologies — straw and haylage reservations, collections and movement history.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050b18',
};

// Applies the saved theme before first paint so there is no flash. Dark is the default.
const themeScript = `try{var t=localStorage.getItem('artic-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" data-theme="dark" className={font.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="backdrop" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
          <span className="grid-sheen" />
        </div>
        {children}
      </body>
    </html>
  );
}
