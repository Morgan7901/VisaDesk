import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  heading: string;
  subheading: string;
}

export function AuthLayout({ children, heading, subheading }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-14 bg-[#0f172a] text-white"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 30% 50%, rgba(30,58,138,0.35) 0%, transparent 65%),
            repeating-linear-gradient(
              -55deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.018) 40px,
              rgba(255,255,255,0.018) 41px
            )
          `,
        }}
      >
        {/* Logo */}
        <div>
          <span className="text-2xl font-bold tracking-tight select-none">
            Visa<span className="text-blue-400">Desk</span>
          </span>
        </div>

        {/* Centre copy */}
        <div className="space-y-5">
          <div className="w-10 h-px bg-blue-400" />
          <h1 className="text-4xl font-semibold leading-snug tracking-tight">
            Built for
            <br />
            migration agents.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Manage cases, workflows, documents, and client communications
            in one compliant platform.
          </p>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} VisaDesk. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-14 lg:px-20 bg-white">
        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Visa<span className="text-blue-600">Desk</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
              {heading}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">{subheading}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
