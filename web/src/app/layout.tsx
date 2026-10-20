import './globals.css';
export const metadata = { title: 'LiveCode Classroom', description: 'Teach code live' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
