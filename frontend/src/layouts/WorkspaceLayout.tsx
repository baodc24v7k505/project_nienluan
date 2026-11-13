import { NavLink, Outlet } from "react-router-dom";
export interface WorkspaceTab {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}
export function WorkspaceLayout({
  title,
  caption,
  tabs,
}: {
  title: string;
  caption: string;
  tabs: WorkspaceTab[];
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0 lg:sticky lg:top-36">
        <div className="mb-5 hidden px-3 lg:block">
          <p className="eyebrow mb-2">{caption}</p>
          <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
        </div>
        <h1 className="mb-4 text-lg font-semibold lg:hidden">{title}</h1>
        <nav
          aria-label={title}
          className="hide-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 lg:flex-col lg:gap-1 lg:bg-transparent lg:p-0"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-3 text-xs font-medium transition lg:text-[13px] ${isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900"}`
              }
            >
              <i
                className={`fas ${tab.icon} w-4 text-center text-xs opacity-70`}
                aria-hidden="true"
              />
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 hidden rounded-2xl bg-[#edeff3] px-4 py-4 lg:block">
          <i
            className="fas fa-circle-info mb-2 text-slate-400"
            aria-hidden="true"
          />
          <p className="text-[11px] leading-5 text-slate-500">
            Các thay đổi được lưu theo tài khoản và quyền truy cập của bạn.
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
