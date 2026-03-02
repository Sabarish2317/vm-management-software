import { motion } from 'framer-motion'

const shimmer = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 1.2,
      repeat: Infinity,
    },
  },
}

const ShimmerBox = ({ className }: { className: string }) => (
  <motion.div
    className={`relative overflow-hidden rounded bg-gray-200 ${className}`}
    variants={shimmer}
    initial="initial"
    animate="animate"
  >
    <motion.div
      className="absolute top-0 left-[-50%] h-full w-[200%] bg-gradient-to-r from-transparent via-white/40 to-transparent"
      animate={{ left: ['-50%', '100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
    />
  </motion.div>
)

const TableSkeleton = () => {
  return (
    <div className="rounded-[12px] bg-white/80 p-4">


      <div className="tables mt-4 flex min-h-[300px] w-full flex-col overflow-clip rounded-[9px] bg-white shadow-sm">

        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className={`flex w-full items-center gap-2 bg-white px-3 py-2`}
          >
            <ShimmerBox className="h-4 w-[60px]" />
            <ShimmerBox className="h-4 w-[120px]" />
            <ShimmerBox className="h-4 w-[160px]" />
            <ShimmerBox className="h-4 w-[120px]" />
            <ShimmerBox className="h-4 w-[140px]" />
            <ShimmerBox className="h-4 w-[160px]" />
            <ShimmerBox className="h-4 w-[160px]" />
            <ShimmerBox className="h-4 w-[120px]" />
            <ShimmerBox className="h-4 w-[100px]" />
            <ShimmerBox className="h-4 w-[120px]" />
            <div className="flex min-w-[120px] flex-row gap-2">
              <ShimmerBox className="h-8 w-8 rounded" />
              <ShimmerBox className="h-8 w-8 rounded" />
              <ShimmerBox className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TableSkeleton
