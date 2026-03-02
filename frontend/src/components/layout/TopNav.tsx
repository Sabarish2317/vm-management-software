import { motion } from 'framer-motion'
import NotificationCenter from '../common/NotificationCenter'
import ProfileMenu from '../common/ProfileMenu'

interface TopNavProps {
  userName?: string
  formattedDate?: string
}
export const TopNav: React.FC<TopNavProps> = ({ userName, formattedDate }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="z-[99] hidden border-b-2 border-gray-200 bg-white px-4 py-2"
    >
      <div className="flex items-center justify-between">
        {/* Welcome Section */}
        {/* Header section */}
        <div
          style={{ zoom: 0.8 }}
          className="container flex w-max flex-row items-center"
        >
          {/* <motion.div
            className="relative flex max-w-full origin-left scale-75 flex-col items-center justify-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.img
              src="/icons/logo-icon-side-nav.svg"
              alt="Logo"
              width={32}
              height={32}
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
            <motion.p
              className="orange-gradient absolute -bottom-2 rounded px-1.5 py-1 text-[10px] font-normal text-white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: 0.4, type: 'tween', stiffness: 200 }}
            >
              Master
            </motion.p>
          </motion.div> */}
          <div className="flex flex-col gap-0">
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl leading-tight font-semibold text-zinc-800"
            >
              Welcome, {userName}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-md text-zinc-500"
            >
              {formattedDate}
            </motion.p>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex scale-90 items-center gap-5"
        >
          <NotificationCenter notifications={2} />

          {/* Profile Image */}
          <ProfileMenu />
        </motion.div>
      </div>
    </motion.header>
  )
}
