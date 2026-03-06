import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export function Layout() {
  return (
    <div className="flex h-screen bg-grey-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
