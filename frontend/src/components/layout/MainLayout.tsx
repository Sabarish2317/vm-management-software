import React from 'react'
import { Outlet } from 'react-router-dom'
import SideNav from './SideNav'
import { TopNav } from './TopNav'

const MainLayout: React.FC = () => {
  // TODO: Replace with user context or auth
  const userName = 'John Doe'

  // TODO: Replace with utility function or Date-fns/Day.js
  const formattedDate = 'Saturday, 11th November 2022'

  return (
    <div className="Main-entry-point flex h-screen w-screen flex-col lg:flex-row overflow-hidden bg-[#FAFAFA]">
      <SideNav />
      <section className="flex h-full w-full flex-col overflow-hidden">
        {/* Top Navbar */}
        <TopNav userName={userName} formattedDate={formattedDate} />
        {/* Content */}
        <main
          id="layout"
          className="main-content mt-4 ml-4 flex-1 overflow-y-auto pb-24 select-none! md:pb-0"
        >
          {/*This is where the nested routes will be rendered which will be given my router dom from app.tsx  */}
          <Outlet />
        </main>
      </section>
    </div>
  )
}

export default MainLayout
