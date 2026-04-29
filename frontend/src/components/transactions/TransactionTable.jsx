import React, { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Search, ChevronDown, ChevronUp, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'

export function TransactionTable({ data, isLoading }) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: info => <span className="text-text-secondary text-sm font-mono">{new Date(info.getValue()).toLocaleDateString('en-IN')}</span>
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: info => (
        <div className="flex items-center gap-2">
          {info.row.original.is_anomaly && (
            <span title="Unusual transaction detected" className="flex items-center gap-1 text-xs text-warning bg-warning/10 border border-warning/30 rounded-full px-2 py-0.5 font-medium">
              <AlertTriangle className="h-3 w-3" /> Suspicious
            </span>
          )}
          <span className="font-medium text-text">{info.getValue()}</span>
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: info => {
        const val = info.getValue()
        let variant = 'default'
        if (val === 'Salary') variant = 'success'
        if (val === 'Food & Dining') variant = 'warning'
        if (val === 'Shopping') variant = 'danger'
        return <Badge variant={variant}>{val}</Badge>
      }
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Amount</div>,
      cell: info => {
        const amount = info.getValue()
        const isCredit = info.row.original.type === 'credit'
        return (
          <div className={`text-right font-mono font-bold text-sm ${isCredit ? 'text-success' : 'text-text'}`}>
            {isCredit ? '+' : '−'}₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        )
      }
    }
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-text-secondary text-sm">Loading transactions…</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Search bar */}
      <div className="flex items-center p-4 border-b border-border bg-card">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-bg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all"
            placeholder="Search transactions…"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-primary/5 text-text-secondary text-xs uppercase tracking-wider border-b border-border">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}
                    className="px-6 py-3.5 font-semibold cursor-pointer select-none hover:text-primary transition-colors"
                    onClick={header.column.getToggleSortingHandler()}>
                    <div className={`flex items-center gap-1 ${header.column.id === 'amount' ? 'justify-end' : ''}`}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: <ChevronUp className="h-3.5 w-3.5 text-primary" />, desc: <ChevronDown className="h-3.5 w-3.5 text-primary" /> }[header.column.getIsSorted()] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id}
                  className={`transition-colors hover:bg-primary/5 ${row.original.is_anomaly ? 'bg-warning/5' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-secondary">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
        <div className="text-sm text-text-secondary">
          Showing <span className="font-semibold text-text">{table.getRowModel().rows.length}</span> of{' '}
          <span className="font-semibold text-text">{data.length}</span> transactions
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
