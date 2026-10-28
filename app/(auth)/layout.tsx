export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">StockFlow</h1>
          <p className="mt-1 text-sm text-secondary">Inventory management for your team</p>
        </div>
        {children}
      </div>
    </div>
  );
}
