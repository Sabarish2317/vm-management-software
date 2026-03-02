/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Edit2,
  EyeIcon,
  Trash2,
  Trash2Icon,
  X,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react'

import SearchSm from './SearchSm'
import ButtonSm from './Buttons'
import DropdownSelect from './DropDown'
import PaginationControls from './Pagination'
import { CheckBox } from './Input'
import { useHandleCancelHook } from '@/hooks/useHandleCancelHook'
import { useHandleDeleteHook } from '@/hooks/useHandleDeleteHook'

// ============= TYPES =============

/**
 * DataCell Configuration:
 * - headingTitle: Column label (use "#DropDown" to mark as dropdown content - won't be rendered as column)
 * - accessVar: Data accessor - 'branch' or 'branch[1]' or function (row=>value)
 * - isArray: Auto-extract array[1] if true
 * - render: Custom renderer (value, row, index) => ReactNode
 * - isFrozenColumn: Sticky column on horizontal scroll
 * - actionButtonsSpace : custom buttons but must design it from scratch
 */
export type DataCell = {
  headingTitle?: string
  isFrozenColumn?: boolean
  headerRender?: () => React.ReactNode
  accessVar?: string | ((row: any) => any)
  className?: string
  sortable?: boolean
  searchable?: boolean
  isArray?: boolean
  isDate?: boolean
  render?: (value: any, row: any, index: number) => React.ReactNode
}

export interface GenericTableProps {
  data: any[] | { records: any[]; totalRecords?: number }
  dataCell: DataCell[]
  isLoading?: boolean
  isHeaderVisible?: boolean
  headerChildren?: React.ReactNode
  isMasterTable?: boolean
  itemsPerPageOptions?: number[]
  defaultItemsPerPage?: number
  newItemLink?: string
  actionWidth?: number | null
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onView?: (row: any) => void
  skeletonRows?: number
  tableTitle?: string
  className?: string
  rowKey?: (row: any, index: number) => string | number
  isSelectable?: boolean
  selectedRowIndices?: number[]
  onSelectionChange?: (selectedIndices: number[], selectedRows: any[]) => void
  onDeleteSelected?: () => void
  // Dropdown row functionality
  isADropDown?: boolean
  isMultipleDropDownAllowed?: boolean
  // more buttons in action space
  customActionButtons?: (row: any) => React.ReactNode
  messageWhenNoData?: string
}

// ============= SHIMMER COMPONENT =============

const shimmer = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
    transition: { duration: 1.2, repeat: Infinity },
  },
}

const ShimmerBox = ({ className }: { className?: string }) => (
  <motion.div
    className={`relative overflow-hidden rounded bg-gray-200 ${className ?? ''}`}
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

// ============= UTILITY FUNCTIONS =============

function toRecords(input: any): { records: any[]; totalRecords?: number } {
  if (!input) return { records: [], totalRecords: 0 }
  if (Array.isArray(input))
    return { records: input, totalRecords: input.length }
  return {
    records: input.records || [],
    totalRecords: input.totalRecords ?? input.records?.length ?? 0,
  }
}

function getNestedValue(accessVar: string, obj: any) {
  if (!accessVar) return undefined
  const parts = accessVar.replace(/\]/g, '').split(/\.|\[/).filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    const idx = Number(p)
    cur = isNaN(idx) ? cur[p] : cur[idx]
  }
  return cur
}

// ============= MAIN COMPONENT =============

export default function GenericTable({
  data,
  dataCell,
  isHeaderVisible = true,
  isMasterTable = false,
  isLoading = false,
  itemsPerPageOptions = [5, 10, 15, 20],
  defaultItemsPerPage = 10,
  newItemLink,
  actionWidth = null,
  onEdit,
  onDelete,
  onView,
  headerChildren,
  skeletonRows = 5,
  className = '',
  rowKey,
  isSelectable = false,
  selectedRowIndices = [],
  onSelectionChange,
  isADropDown = false,
  isMultipleDropDownAllowed = false,
  customActionButtons,
  onDeleteSelected = () => {},
  messageWhenNoData = 'No records found.',
}: GenericTableProps) {
  const nav = useNavigate()
  const { records } = toRecords(data)

  // ============= STATE =============
  const [searchValue, setSearchValue] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: string | ((r: any) => any) | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [showFrozenShadow, setShowFrozenShadow] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // ============= REFS =============
  const actionBodyRefs = useRef<HTMLDivElement[]>([])
  const headerActionRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)

  // ============= MEMOIZED VALUES =============

  const selectedIndicesSet = useMemo(
    () => new Set(selectedRowIndices),
    [selectedRowIndices]
  )

  // Separate regular columns from dropdown content columns
  const { regularColumns, dropdownColumn } = useMemo(() => {
    const regular = dataCell.filter((cell) => cell.headingTitle !== '#DropDown')
    const dropdown = dataCell.find((cell) => cell.headingTitle === '#DropDown')
    return { regularColumns: regular, dropdownColumn: dropdown }
  }, [dataCell])

  // Split regular columns into frozen and scrollable
  const { frozenColumns, scrollableColumns } = useMemo(() => {
    const frozen = regularColumns.filter((cell) => cell.isFrozenColumn)
    const scrollable = regularColumns.filter((cell) => !cell.isFrozenColumn)
    return { frozenColumns: frozen, scrollableColumns: scrollable }
  }, [regularColumns])

  const hasFrozenColumns = frozenColumns.length > 0
  const hasActions = Boolean(onEdit || onDelete || onView)

  // Estimate action column width
  const estimatedActionWidth = useMemo(() => {
    if (actionWidth !== null) return actionWidth
    let buttonCount = 0
    if (onView && !isMasterTable) buttonCount++
    if (onEdit) buttonCount++
    if (onDelete) buttonCount++
    if (isADropDown) buttonCount++ // Add dropdown toggle button
    if (customActionButtons) buttonCount++
    if (buttonCount === 0) return 0
    return buttonCount * 36 + (buttonCount - 1) * 8 + 16
  }, [
    onView,
    onEdit,
    onDelete,
    customActionButtons,
    isADropDown,
    actionWidth,
    isMasterTable,
  ])

  // ============= CELL VALUE RESOLUTION =============

  const resolveCellValue = useCallback((row: any, cell: DataCell): any => {
    let raw: any
    try {
      if (typeof cell.accessVar === 'function') raw = cell.accessVar(row)
      else if (cell.accessVar) raw = getNestedValue(String(cell.accessVar), row)
      else raw = undefined
    } catch {
      raw = undefined
    }

    if (cell.isArray && Array.isArray(raw)) {
      return raw[1] ?? raw[0] ?? ''
    }

    return raw
  }, [])

  const convertDateFormat = useCallback((dateStr: string): string => {
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-')
      return `${year}-${month}-${day}`
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/')
      return `${year}-${month}-${day}`
    }
    return dateStr
  }, [])

  const isDateValue = useCallback(
    (value: any): boolean => {
      if (value instanceof Date) return true
      if (typeof value === 'string') {
        const datePatterns = [
          /^\d{4}-\d{2}-\d{2}/,
          /^\d{2}\/\d{2}\/\d{4}/,
          /^\d{2}-\d{2}-\d{4}/,
          /^\d{4}\/\d{2}\/\d{2}/,
          /^\d{1,2}\/\d{1,2}\/\d{4}/,
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ]
        if (datePatterns.some((pattern) => pattern.test(value))) {
          const convertedDate = convertDateFormat(value)
          return !isNaN(Date.parse(convertedDate))
        }
      }
      return false
    },
    [convertDateFormat]
  )

  const getStringValue = useCallback((raw: any): string => {
    if (raw === null || raw === undefined) return ''
    if (Array.isArray(raw)) return String(raw[1] ?? raw[0] ?? '')
    if (raw !== null && typeof raw === 'object') {
      if ('name' in raw) return String((raw as any).name)
      if ('label' in raw) return String((raw as any).label)
      try {
        return JSON.stringify(raw)
      } catch {
        return String(raw)
      }
    }
    return String(raw)
  }, [])

  const getSortableValue = useCallback(
    (raw: any): any => {
      if (raw === null || raw === undefined) return null
      if (Array.isArray(raw)) {
        const value = raw[1] ?? raw[0] ?? null
        if (isDateValue(value)) {
          const convertedDate = convertDateFormat(String(value))
          return new Date(convertedDate)
        }
        return value
      }
      if (isDateValue(raw)) {
        const convertedDate = convertDateFormat(String(raw))
        return new Date(convertedDate)
      }
      if (raw !== null && typeof raw === 'object') {
        if ('name' in raw) return (raw as any).name
        if ('label' in raw) return (raw as any).label
        return raw
      }
      return raw
    },
    [isDateValue, convertDateFormat]
  )

  // ============= DROPDOWN LOGIC =============

  const toggleRowExpansion = useCallback(
    (globalIndex: number) => {
      if (!isADropDown) return

      setExpandedRows((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(globalIndex)) {
          newSet.delete(globalIndex)
        } else {
          if (!isMultipleDropDownAllowed) {
            newSet.clear() // Close all other dropdowns
          }
          newSet.add(globalIndex)
        }
        return newSet
      })
    },
    [isADropDown, isMultipleDropDownAllowed]
  )

  const isRowExpanded = useCallback(
    (globalIndex: number) => {
      return expandedRows.has(globalIndex)
    },
    [expandedRows]
  )

  // ============= SELECTION LOGIC (Helpers - full logic after data processing) =============

  const isRowSelected = useCallback(
    (globalIndex: number) => {
      if (!isSelectable) return false
      return selectedIndicesSet.has(globalIndex)
    },
    [isSelectable, selectedIndicesSet]
  )

  const clearSelection = useCallback(() => {
    if (!isSelectable || !onSelectionChange) return
    onSelectionChange([], [])
  }, [isSelectable, onSelectionChange])

  // ============= DATA PROCESSING =============

  // Search filtering
  const searchableCells = regularColumns.filter(
    (c) => (c.searchable ?? true) === true
  )

  const filtered = useMemo(() => {
    if (!searchValue) return records
    const q = searchValue.toLowerCase().trim()
    return records.filter((row) => {
      for (const cell of searchableCells) {
        const v = resolveCellValue(row, cell)
        const searchStr = getStringValue(v)
        if (searchStr.toLowerCase().includes(q)) return true
      }
      return false
    })
  }, [records, searchValue, searchableCells, resolveCellValue, getStringValue])

  // Sorting
  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered
    const arr = [...filtered]
    arr.sort((a, b) => {
      let valA: any, valB: any
      if (typeof sortConfig.key === 'function') {
        valA = sortConfig.key(a)
        valB = sortConfig.key(b)
      } else {
        const col = regularColumns.find(
          (c) =>
            (typeof c.accessVar === 'string' &&
              c.accessVar === sortConfig.key) ||
            c.headingTitle === sortConfig.key
        )
        if (col) {
          valA = resolveCellValue(a, col)
          valB = resolveCellValue(b, col)
        } else {
          valA = getNestedValue(String(sortConfig.key), a)
          valB = getNestedValue(String(sortConfig.key), b)
        }
      }

      const sortA = getSortableValue(valA)
      const sortB = getSortableValue(valB)

      if (sortA === null && sortB === null) return 0
      if (sortA === null) return 1
      if (sortB === null) return -1

      if (sortA instanceof Date && sortB instanceof Date) {
        const timeA = sortA.getTime()
        const timeB = sortB.getTime()
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA
      }

      if (sortA instanceof Date || sortB instanceof Date) {
        const strA =
          sortA instanceof Date ? sortA.toISOString() : getStringValue(sortA)
        const strB =
          sortB instanceof Date ? sortB.toISOString() : getStringValue(sortB)
        return sortConfig.direction === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA)
      }

      const numA = Number(sortA)
      const numB = Number(sortB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA
      }

      const strA = getStringValue(sortA)
      const strB = getStringValue(sortB)
      return sortConfig.direction === 'asc'
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA)
    })
    return arr
  }, [
    filtered,
    sortConfig,
    regularColumns,
    getSortableValue,
    getStringValue,
    resolveCellValue,
  ])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

  // ============= EFFECTS =============

  useEffect(() => {
    setCurrentPage(1)
  }, [records.length])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current) {
        setShowFrozenShadow(tableContainerRef.current.scrollLeft > 0)

        // Sync custom scrollbar with table scroll
        if (scrollbarRef.current && hasFrozenColumns) {
          scrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft
        }
      }
    }

    const tableContainer = tableContainerRef.current
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasFrozenColumns])

  // Sync table scroll with custom scrollbar scroll
  useEffect(() => {
    const handleScrollbarScroll = () => {
      if (
        scrollbarRef.current &&
        tableContainerRef.current &&
        hasFrozenColumns
      ) {
        tableContainerRef.current.scrollLeft = scrollbarRef.current.scrollLeft
      }
    }

    const scrollbar = scrollbarRef.current
    if (scrollbar && hasFrozenColumns) {
      scrollbar.addEventListener('scroll', handleScrollbarScroll)
      return () =>
        scrollbar.removeEventListener('scroll', handleScrollbarScroll)
    }
  }, [hasFrozenColumns])

  // ============= HANDLERS =============

  const onSort = useCallback((cell: DataCell) => {
    if (cell.sortable === false) return
    const key = cell.accessVar ?? cell.headingTitle ?? `column_${Date.now()}`
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }, [])

  // Selection handlers (now that sorted/paginated are available)
  const toggleRowSelection = useCallback(
    (globalIndex: number) => {
      if (!isSelectable || !onSelectionChange) return

      const newSelectedIndices = [...selectedRowIndices]
      if (selectedIndicesSet.has(globalIndex)) {
        const indexToRemove = newSelectedIndices.indexOf(globalIndex)
        if (indexToRemove > -1) {
          newSelectedIndices.splice(indexToRemove, 1)
        }
      } else {
        newSelectedIndices.push(globalIndex)
      }

      const selectedRows = newSelectedIndices
        .map((index) => sorted[index])
        .filter(Boolean)
      onSelectionChange(newSelectedIndices, selectedRows)
    },
    [
      isSelectable,
      onSelectionChange,
      selectedRowIndices,
      selectedIndicesSet,
      sorted,
    ]
  )

  const getCurrentPageGlobalIndices = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return Array.from({ length: paginated.length }, (_, i) => startIndex + i)
  }, [currentPage, itemsPerPage, paginated.length])

  const isAllCurrentPageSelected = useCallback(() => {
    if (!isSelectable || paginated.length === 0) return false
    const currentPageIndices = getCurrentPageGlobalIndices()
    return currentPageIndices.every((index) => selectedIndicesSet.has(index))
  }, [
    isSelectable,
    selectedIndicesSet,
    getCurrentPageGlobalIndices,
    paginated.length,
  ])

  const toggleAllCurrentPageSelection = useCallback(() => {
    if (!isSelectable || !onSelectionChange) return

    const currentPageIndices = getCurrentPageGlobalIndices()
    let newSelectedIndices = [...selectedRowIndices]

    if (isAllCurrentPageSelected()) {
      newSelectedIndices = newSelectedIndices.filter(
        (index) => !currentPageIndices.includes(index)
      )
    } else {
      const indicesToAdd = currentPageIndices.filter(
        (index) => !selectedIndicesSet.has(index)
      )
      newSelectedIndices.push(...indicesToAdd)
    }

    const selectedRows = newSelectedIndices
      .map((index) => sorted[index])
      .filter(Boolean)
    onSelectionChange(newSelectedIndices, selectedRows)
  }, [
    isSelectable,
    onSelectionChange,
    getCurrentPageGlobalIndices,
    selectedRowIndices,
    isAllCurrentPageSelected,
    selectedIndicesSet,
    sorted,
  ])

  const getColumnClassName = useCallback((cell: DataCell) => {
    const base = cell.className ?? 'min-w-[104px] w-[104px] max-w-[104px]'
    return `flex-none shrink-0 ${base}`
  }, [])

  const defaultRowKey = useCallback(
    (r: any, i: number) => (rowKey ? rowKey(r, i) : (r.id ?? r.code ?? i)),
    [rowKey]
  )

  // ============= RENDER HELPERS =============

  const renderHeaderCell = useCallback(
    (cell: DataCell, idx: number) => {
      const isSorted =
        sortConfig.key ===
        (cell.accessVar ?? cell.headingTitle ?? `column_${idx}`)
      const isAsc = sortConfig.direction === 'asc'

      return (
        <div
          key={(cell.headingTitle ?? `column_${idx}`) + idx}
          className={`px-1 ${getColumnClassName(cell)}`}
          onClick={() => onSort(cell)}
          role={cell.sortable === false ? undefined : 'button'}
        >
          <div className="flex cursor-pointer items-center gap-1 select-none">
            <div className="text-sm font-medium text-[#1F1F21]">
              {cell.headerRender ? cell.headerRender() : cell.headingTitle}
            </div>
            {cell.sortable !== false && (
              <motion.div
                animate={{
                  alignItems: isSorted ? 'flex-start' : 'center',
                  justifyContent: isSorted ? 'flex-start' : 'center',
                }}
                className="ml-2 flex w-4 flex-col gap-[2px]"
              >
                <motion.div
                  style={{
                    width: 4,
                    height: 2,
                    backgroundColor: isSorted ? '#30394a' : '#8caab6',
                    borderRadius: 12,
                  }}
                  animate={{ width: isSorted ? (isAsc ? 5 : 12) : 12 }}
                  transition={{
                    type: 'spring',
                    stiffness: 250,
                    damping: 12,
                    mass: 0.5,
                  }}
                />
                <motion.div
                  style={{
                    width: 4,
                    height: 2,
                    backgroundColor: isSorted ? '#30394a' : '#a2b4bf',
                    borderRadius: 12,
                  }}
                  animate={{ width: isSorted ? 9 : 9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 250,
                    damping: 12,
                    mass: 0.5,
                  }}
                />
                <motion.div
                  style={{
                    width: 4,
                    height: 2,
                    backgroundColor: isSorted ? '#30394a' : '#a2b4bf',
                    borderRadius: 12,
                  }}
                  animate={{ width: isSorted ? (isAsc ? 12 : 6) : 6 }}
                  transition={{
                    type: 'spring',
                    stiffness: 250,
                    damping: 12,
                    mass: 0.5,
                  }}
                />
              </motion.div>
            )}
          </div>
        </div>
      )
    },
    [sortConfig, getColumnClassName, onSort]
  )

  const renderCellValue = useCallback(
    (value: any, cell: DataCell, row: any, idx: number) => {
      if (cell.render) {
        return cell.render(value, row, idx)
      }

      if (Array.isArray(value)) {
        return <span>{value[1] ?? value[0] ?? '-'}</span>
      }

      return <span>{value == null ? '-' : String(value)}</span>
    },
    []
  )

  useHandleCancelHook(selectedRowIndices.length >= 1, clearSelection)
  useHandleDeleteHook(selectedRowIndices.length >= 1, onDeleteSelected)
  // ============= JSX RENDER =============

  const skeletonCount = isLoading ? itemsPerPage || skeletonRows : 0

  return (
    <div
      className={`flex min-h-full flex-col justify-between rounded-[12px] border-2 border-[#F1F1F1] bg-white py-3 ${className}`}
    >
      {/* Frozen column styles */}
      {hasFrozenColumns && (
        <style>{`
          .frozen-column-shadow {
            position: relative;
          }
          .frozen-column-shadow::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            width: 3px;
            opacity: 0;
            background: linear-gradient(to right, rgba(0,0,5,0.05), transparent);
            pointer-events: none;
            z-index: 15;
            transition: opacity 0.3s ease-in-out;
          }
          .frozen-column-shadow.show-shadow::after {
            opacity: 1;
          }
          .frozen-serial-column {
            position: sticky !important;
            left: 0 !important;
            z-index: 12;
            background: inherit !important;
          }
          .frozen-data-column {
            position: sticky !important;
            z-index: 11;
            background: inherit !important;
          }
          .group:hover .frozen-column-hover-bg {
            background-color: rgb(248 250 252) !important;
          }
        `}</style>
      )}

      <div className="body-container flex flex-col gap-0">
        {/* Header Controls */}
        {isHeaderVisible && (
          <header className="mb-3 flex w-full flex-row items-center justify-between px-3">
            <section className="flex w-max flex-row items-center gap-2">
              <SearchSm
                containerClassName={`${isMasterTable ? '' : 'min-w-[200px]! '} `}
                placeholder="Search"
                onChange={(e: any) => {
                  setSearchValue(e.target.value)
                  setCurrentPage(1)
                }}
                inputValue={searchValue}
                onSearch={() => {}}
                onClear={() => {
                  setSearchValue('')
                  setCurrentPage(1)
                }}
              />

              <DropdownSelect
                className="min-w-[130px]!"
                allowClear={false}
                title=""
                direction="down"
                options={itemsPerPageOptions.map((item) => ({
                  id: item,
                  label: `${item} Entries`,
                }))}
                selected={{
                  id: itemsPerPage,
                  label: `${itemsPerPage} Entries`,
                }}
                onChange={(e: any) => {
                  setItemsPerPage(e.id)
                  setCurrentPage(1)
                }}
              />
            </section>

            <section className="flex w-full items-center justify-end gap-2">
              {newItemLink && (
                <ButtonSm
                  className="py-3 text-white"
                  state="default"
                  text="New"
                  onClick={() => nav(newItemLink)}
                />
              )}

              {/* Selection Status */}
              {isSelectable && selectedRowIndices.length > 0 && (
                <>
                  <div className="ml-4 flex flex-row items-center gap-2 rounded-md bg-[#f3f3f3] px-3 py-3 text-sm font-medium text-blue-800">
                    <span className="flex text-sm font-medium text-slate-900">
                      Selected:{' '}
                      <span className="flex min-w-4">
                        {selectedRowIndices.length}{' '}
                      </span>
                    </span>
                    <button
                      onClick={clearSelection}
                      className="cursor-pointer border-0 bg-transparent p-0 transition-transform hover:scale-110"
                    >
                      <X size={16} className="text-slate-900" />
                    </button>
                  </div>
                  <div className="flex cursor-pointer flex-row items-center gap-2 rounded-md bg-red-600 px-3 py-3 text-sm font-medium text-white transition-transform hover:scale-105">
                    Delete All
                    <Trash2Icon
                      className="border-0 bg-transparent p-0 text-white"
                      onClick={() => {
                        onDeleteSelected()
                      }}
                      size={14}
                    />
                  </div>
                </>
              )}
              {headerChildren}
              <PaginationControls
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </section>
          </header>
        )}

        {/* Table */}
        <div
          ref={tableContainerRef}
          className="tables relative flex min-h-[300px] w-full flex-col overflow-x-auto bg-white md:overflow-x-auto"
        >
          {/* Header Row */}
          <header
            className={`header flex min-w-max flex-row items-center justify-between gap-2 border-y-2 border-y-[#F1F1F1] bg-[#FAFAFA] px-3 shadow-sm ${hasFrozenColumns ? 'has-frozen relative' : 'sticky left-0'}`}
          >
            {/* S.No column */}
            <div
              className={`flex ${isSelectable ? 'w-[70px]' : 'w-[56px]'} frozen-serial-column my-4 shrink-0 flex-row items-center justify-between gap-2 bg-transparent! px-1.5`}
            >
              {isSelectable && (
                <CheckBox
                  className="h-6! w-6! origin-top-left scale-[0.70]"
                  label=""
                  checked={isAllCurrentPageSelected()}
                  onChange={toggleAllCurrentPageSelection}
                />
              )}
              <p className="text-left text-sm font-medium text-[#1F1F21]">
                S.No
              </p>
            </div>

            {/* Frozen columns */}
            {frozenColumns.map((cell, idx) => (
              <div
                key={(cell.headingTitle || '') + idx}
                className={`${getColumnClassName(cell)} frozen-data-column bg-[#F8F9FB] py-4 ${
                  idx === frozenColumns.length - 1
                    ? `frozen-column-shadow ${showFrozenShadow ? 'show-shadow' : ''}`
                    : ''
                }`}
                style={{
                  left: `${(isSelectable ? 70 : 56) + idx * 104}px`,
                }}
                onClick={() => onSort(cell)}
                role={cell.sortable === false ? undefined : 'button'}
              >
                <div className="flex cursor-pointer items-center gap-1 px-1 select-none">
                  <div className="text-sm font-medium text-[#1F1F21]">
                    {cell.headerRender
                      ? cell.headerRender()
                      : (cell.headingTitle ?? 'Column')}
                  </div>
                </div>
              </div>
            ))}

            {/* Scrollable columns */}
            {scrollableColumns.map((cell, idx) => renderHeaderCell(cell, idx))}

            {/* Action header */}
            {hasActions && (
              <div
                className="flex min-w-max flex-col items-start"
                ref={headerActionRef}
                style={{
                  width:
                    actionWidth !== null
                      ? `${actionWidth}px`
                      : `${estimatedActionWidth}px`,
                }}
              >
                <p className="px-3 text-sm font-medium text-[#1F1F21]">
                  Action
                </p>
              </div>
            )}
          </header>

          {/* Skeleton Loading */}
          {isLoading && (
            <div>
              {Array.from({ length: skeletonCount }).map((_, rIdx) => (
                <div
                  key={rIdx}
                  className="flex w-full flex-row items-center justify-between border-b border-[#F1F1F1] px-3 py-2"
                >
                  <div
                    className={`flex w-8 min-w-8 items-center justify-start gap-2 py-4 pl-1.5 ${hasFrozenColumns ? 'frozen-serial-column' : ''}`}
                  >
                    <ShimmerBox className="h-4 w-10" />
                  </div>

                  {frozenColumns.map((cell, cIdx) => (
                    <div
                      key={cIdx}
                      className={`px-1 py-4 ${getColumnClassName(cell)} ${hasFrozenColumns ? 'frozen-data-column bg-white' : ''}`}
                      style={{
                        left: hasFrozenColumns
                          ? `${(isSelectable ? 70 : 56) + cIdx * 104}px`
                          : undefined,
                      }}
                    >
                      <ShimmerBox className="h-4 w-full max-w-28" />
                    </div>
                  ))}

                  {scrollableColumns.map((cell, cIdx) => (
                    <div
                      key={cIdx}
                      className={`px-1 py-4 ${getColumnClassName(cell)}`}
                    >
                      <ShimmerBox className="h-4 w-full max-w-28" />
                    </div>
                  ))}

                  {hasActions && (
                    <div
                      className="flex min-w-max items-center gap-2 px-1"
                      style={{
                        width:
                          actionWidth !== null
                            ? `${actionWidth}px`
                            : `${estimatedActionWidth}px`,
                      }}
                    >
                      {onView && !isMasterTable && (
                        <ShimmerBox className="h-4 w-20" />
                      )}
                      {onEdit && <ShimmerBox className="h-4 w-20" />}
                      {onDelete && <ShimmerBox className="h-4 w-20" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Data */}
          {!isLoading && paginated.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="my-auto flex max-h-[400px] max-w-[600px] flex-col items-center justify-center self-center rounded-2xl border-2 border-dashed border-[#F1F1F1] bg-[#F8F9FB] p-10 text-slate-600 shadow-sm"
            >
              <div className="mb-4 rounded-full bg-slate-200 p-4 shadow-sm">
                <Inbox size={36} className="text-slate-500" />
              </div>
              <p className="items-center text-center text-lg font-medium text-slate-600">
                {messageWhenNoData}
                <p className="text-center text-sm font-medium text-slate-400">
                  Try adjusting your search or filter to find what you're
                  looking for.
                </p>
              </p>
            </motion.div>
          )}

          {/* Data Rows */}
          {!isLoading &&
            paginated.map((row, idx) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + idx
              const isExpanded = isRowExpanded(globalIndex)
              const isRowChecked = isRowSelected(globalIndex)

              return (
                <React.Fragment key={defaultRowKey(row, idx)}>
                  {/* Main Row */}
                  <div
                    style={{
                      cursor: isMasterTable ? 'pointer' : 'auto',
                      boxShadow: isRowChecked
                        ? 'inset 3px 0 0 #f97316'
                        : undefined,
                    }}
                    onClick={(e) => {
                      if (isMasterTable && onView) {
                        e.stopPropagation()
                        onView(row)
                      }
                    }}
                    className={`group flex min-w-max flex-row items-center justify-between gap-2 border-b border-[#F1F1F1] px-3 text-sm text-[#1F1F21] ${
                      isRowChecked
                        ? 'bg-orange-100'
                        : 'bg-white hover:bg-slate-50/70'
                    } ${hasFrozenColumns ? 'has-frozen' : ''}`}
                  >
                    {/* S.No column */}
                    <div
                      className={`flex ${isSelectable ? 'w-[70px]' : 'w-[56px]'} frozen-serial-column frozen-column-hover-bg min-h-full! shrink-0 flex-row items-center justify-between gap-2 px-1.5 py-4 ${
                        isRowChecked ? 'bg-transparent' : 'bg-transparent'
                      }`}
                    >
                      {isSelectable && (
                        <CheckBox
                          className="mr-1 h-6! w-6! origin-top-left scale-[0.70]"
                          label=""
                          checked={isRowSelected(globalIndex)}
                          onChange={() => toggleRowSelection(globalIndex)}
                        />
                      )}
                      <p className="w-10 text-left font-medium">
                        {globalIndex + 1}
                      </p>
                    </div>

                    {/* Frozen columns */}
                    {frozenColumns.map((cell, cIdx) => {
                      const value = resolveCellValue(row, cell)
                      return (
                        <div
                          key={(cell.headingTitle || '') + cIdx}
                          className={`px-1 ${getColumnClassName(cell)} frozen-data-column frozen-column-hover-bg py-4 ${
                            cIdx === frozenColumns.length - 1
                              ? `frozen-column-shadow ${showFrozenShadow ? 'show-shadow' : ''}`
                              : ''
                          } ${isRowChecked ? 'bg-orange-100' : 'bg-white'}`}
                          style={{
                            left: `${(isSelectable ? 70 : 56) + cIdx * 104}px`,
                          }}
                        >
                          <div className="text-left text-sm leading-tight font-medium break-words whitespace-normal">
                            {renderCellValue(value, cell, row, idx)}
                          </div>
                        </div>
                      )
                    })}

                    {/* Scrollable columns */}
                    {scrollableColumns.map((cell, cIdx) => {
                      const value = resolveCellValue(row, cell)
                      return (
                        <div
                          key={(cell.headingTitle || '') + cIdx}
                          className={`px-1 py-4 ${getColumnClassName(cell)}`}
                        >
                          <div className="text-left text-sm leading-tight font-medium break-words whitespace-normal">
                            {renderCellValue(value, cell, row, idx)}
                          </div>
                        </div>
                      )
                    })}

                    {/* Action buttons */}
                    {hasActions && (
                      <div
                        className="flex min-w-max flex-row items-center gap-2 px-2"
                        ref={(el) => {
                          if (el) actionBodyRefs.current.push(el)
                        }}
                      >
                        {onView && !isMasterTable && (
                          <ButtonSm
                            className="aspect-square bg-white outline-1 outline-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              onView(row)
                            }}
                            iconPosition="right"
                            state="outline"
                          >
                            <EyeIcon size={14} />
                          </ButtonSm>
                        )}
                        {onEdit && (
                          <ButtonSm
                            className="aspect-square bg-white outline-1 outline-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit(row)
                            }}
                            state="outline"
                          >
                            <Edit2 size={14} />
                          </ButtonSm>
                        )}
                        {customActionButtons && customActionButtons(row)}
                        {onDelete && (
                          <ButtonSm
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete(row)
                            }}
                            className="aspect-square bg-white shadow-sm outline-1 outline-white hover:bg-red-100 active:bg-red-100"
                            state="default"
                          >
                            <Trash2
                              className="text-red-500 hover:text-red-800 active:text-red-200"
                              size={14}
                            />
                          </ButtonSm>
                        )}
                        {/* Dropdown toggle button */}
                        {isADropDown && dropdownColumn && (
                          <ButtonSm
                            className="aspect-square items-center justify-center bg-white outline-1 outline-white"
                            title="Show Dropdown"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRowExpansion(globalIndex)
                            }}
                            state="outline"
                          >
                            {isExpanded ? (
                              <ChevronUp
                                size={16}
                                className="text-orange-500"
                              />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </ButtonSm>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Row */}
                  {isADropDown && dropdownColumn && isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-b border-[#F1F1F1] bg-slate-50 px-3"
                    >
                      <div className="py-4">
                        {dropdownColumn.render
                          ? dropdownColumn.render(null, row, idx)
                          : 'No dropdown content defined'}
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              )
            })}
        </div>
      </div>

      {/* Custom Horizontal Scrollbar for Frozen Columns */}

      {/* Scrollbar styling for main table */}
      <style>{`
  /* Main table scrollbar - always visible */
  .tables::-webkit-scrollbar {
    height: 6px;
  }
  .tables::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 6px;
    margin: 0 4px;
  }
  .tables::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #9ca3af 0%, #6b7280 100%);
    border-radius: 6px;
    border: 2px solid #f8fafc;
    transition: background 0.2s ease, box-shadow 0.2s ease;
  }
  .tables::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #81858e 0%, #525866 100%);
    box-shadow: 0 0 4px rgba(107, 114, 128, 0.3);
  }
  .tables::-webkit-scrollbar-thumb:active {
    background: linear-gradient(180deg, #6b7280 0%, #3f444d 100%);
    box-shadow: 0 0 3px rgba(75, 85, 99, 0.4);
  }

  /* Firefox scrollbar */
  .tables {
    scrollbar-width: thin;
    scrollbar-color: #9ca3af #f8fafc;
  }
`}</style>

      {/* Footer Pagination */}
      <footer className="container mt-3 flex min-w-full flex-row items-center gap-2 self-end px-4 py-2">
        <div className="h-[10px] w-[10px] rounded-full bg-orange-500" />
        <div className="text-sm text-zinc-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
          {Math.min(currentPage * itemsPerPage, sorted.length)} of{' '}
          {sorted.length}
        </div>
      </footer>
    </div>
  )
}
