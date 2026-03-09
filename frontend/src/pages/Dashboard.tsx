import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Server,
  Monitor,
  Activity,
  AlertTriangle,
  RefreshCw,
  Layers,
  LayoutGrid,
  LogOut,
} from 'lucide-react'
import Cookies from 'js-cookie'
import { useDashboardData } from '@/queries/useDashboard'
import ClusterMonitoring from '@/components/dashboard/ClusterMonitoring'
import VMMonitoring from '@/components/dashboard/VMMonitoring'
import NodeDetailDialog from '@/components/dashboard/NodeDetailDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import LogoutConfirmModal from '@/components/layout/LogoutConfirmModal'
import { TOKEN_KEY } from '@/utils/authHandler'
import type { NodeMetrics } from '@/types/prometheus'

// ─── Summary metric card ──────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accent?: 'default' | 'success' | 'warn' | 'danger'
}

const accentMap = {
  default: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-600',
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  icon,
  accent = 'default',
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35 }}
  >
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            accentMap[accent]
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <p className="text-foreground text-xl leading-tight font-bold">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

// ─── Tab button ───────────────────────────────────────────────────────────────

interface TabBtnProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}

const TabBtn: React.FC<TabBtnProps> = ({
  active,
  onClick,
  icon,
  label,
  count,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'bg-muted text-muted-foreground hover:bg-muted/70'
    )}
  >
    {icon}
    {label}
    {count !== undefined && (
      <span
        className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold',
          active
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-background text-foreground'
        )}
      >
        {count}
      </span>
    )}
  </button>
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

type DashTab = 'cluster' | 'vm'

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashTab>('cluster')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [selectedNode, setSelectedNode] = useState<NodeMetrics | null>(null)
  const navigate = useNavigate()

  const handleLogout = () => {
    Cookies.remove(TOKEN_KEY)
    localStorage.removeItem('VM_USER')
    navigate('/sign-in', { replace: true })
  }

  const {
    linuxNodes,
    windowsNodes,
    summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardData()

  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <>
      <div className="flex flex-col gap-6 px-1 pb-10">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icons/logo.png" alt="Logo" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                size={13}
                className={isFetching ? 'animate-spin' : ''}
              />
              {isFetching ? 'Refreshing…' : `Updated ${lastUpdated}`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogoutModal(true)}
              className="gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={13} />
              Logout
            </Button>
          </div>
          <LogoutConfirmModal
            open={showLogoutModal}
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
          />
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <SummaryCard
            label="Host Machines"
            value={summary.totalHosts}
            icon={<Server size={16} />}
          />
          <SummaryCard
            label="Virtual Machines"
            value={summary.totalVMs}
            icon={<Monitor size={16} />}
          />
          <SummaryCard
            label="Running"
            value={summary.runningCount}
            icon={<Activity size={16} />}
            accent="success"
          />
          <SummaryCard
            label="Unreachable"
            value={summary.unreachableCount}
            icon={<AlertTriangle size={16} />}
            accent={summary.unreachableCount > 0 ? 'danger' : 'default'}
          />
          <SummaryCard
            label="Avg CPU"
            value={`${summary.avgCpuPercent.toFixed(1)}%`}
            icon={<Activity size={16} />}
            accent={summary.avgCpuPercent >= 85 ? 'warn' : 'default'}
          />
          <SummaryCard
            label="Avg Memory"
            value={`${summary.avgMemPercent.toFixed(1)}%`}
            icon={<Activity size={16} />}
            accent={summary.avgMemPercent >= 85 ? 'warn' : 'default'}
          />
        </div>

        {/* ── Error banner ── */}
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not reach backend</AlertTitle>
              <AlertDescription>
                {(error as Error)?.message ??
                  'Check that the backend is running and VITE_API_BASE_URL is set correctly.'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* ── Mode tabs ── */}
        <div className="flex gap-2">
          <TabBtn
            active={activeTab === 'cluster'}
            onClick={() => setActiveTab('cluster')}
            icon={<Layers size={14} />}
            label="Cluster Monitoring"
            count={summary.linuxCount}
          />
          <TabBtn
            active={activeTab === 'vm'}
            onClick={() => setActiveTab('vm')}
            icon={<LayoutGrid size={14} />}
            label="VM Monitoring"
            count={summary.windowsCount}
          />
        </div>

        {/* ── Tab content ── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 'cluster' ? (
            <ClusterMonitoring
              nodes={linuxNodes}
              isLoading={isLoading}
              isFetching={isFetching}
              onRefresh={refetch}
              onNodeClick={setSelectedNode}
            />
          ) : (
            <VMMonitoring
              vms={windowsNodes}
              isLoading={isLoading}
              isFetching={isFetching}
              onRefresh={refetch}
              onNodeClick={setSelectedNode}
            />
          )}
        </motion.div>
      </div>

      {/* ── Node detail popup ── */}
      {selectedNode && (
        <NodeDetailDialog
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </>
  )
}

export default Dashboard
