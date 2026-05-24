import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';
import { Layout } from "@/components/layout/Layout";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-background p-4 sm:p-8">
        <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Animated Icon */}
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/10">
            <AlertCircle className="w-12 h-12 text-primary" />
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" style={{ animationDuration: '3s' }} />
          </div>

          {/* Text Content */}
          <div className="space-y-4">
            <h1 className="text-8xl font-black text-foreground tracking-tighter">
              4<span className="text-primary">0</span>4
            </h1>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Oops! Page not found
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
          </div>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
