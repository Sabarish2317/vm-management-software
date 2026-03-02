import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, LogOut } from 'lucide-react'
import { appRoutes } from '../../routes/appRoutes'
import useClickOutside from '../../hooks/useClickOutside'

export default function ProfileMenu() {
  // const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)

  const random = React.useRef(Math.floor(Math.random() * 50)).current
  // 🟢 On mount, load theme from localStorage OR system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark')
      setDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDark(false)
    }
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    if (html.classList.contains('dark')) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setDark(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setDark(true)
    }
  }

  const [containerRef, open, setOpen] = useClickOutside(false)

  const handleLogout = () => {
    localStorage.removeItem('CATERING_TOKEN')
    window.location.href = appRoutes.signInPage
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Avatar */}
      <motion.button
        onClick={() => setOpen(!open)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ delay: 0.3 }}
        className="cursor-pointer overflow-hidden rounded-full bg-slate-100 transition-all hover:scale-105 hover:scale-3d hover:bg-slate-200"
      >
        <img
          // '/images/profile.jpg'
          key={Number(random)}
          src={`https://randomuser.me/api/portraits/men/${random}.jpg`}
          alt="Profile"
          className="h-9 w-9 rounded-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/images/default-user.png'
          }}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
          >
            {/* Profile details */}
            <div className="mb-3 flex items-center gap-3 border-b border-[#F1F1F1] pb-3">
              <img
                src={`https://randomuser.me/api/portraits/men/${random}.jpg`}
                alt="Profile"
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-slate-800">John Doe</p>
                <p className="text-sm text-slate-500">john.doe@email.com</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={toggleTheme}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {dark ? (
                  <>
                    <Sun className="h-4 w-4" /> Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" /> Dark Mode
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
