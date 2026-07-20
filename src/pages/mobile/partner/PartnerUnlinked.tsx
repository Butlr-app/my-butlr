import { Link2Off } from 'lucide-react'

export function PartnerUnlinked({ title }: { title: string }) {
  return (
    <div className="bg-gray-950 min-h-screen">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
      </div>
      <div className="px-5 mt-8">
        <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Link2Off className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-sm font-semibold text-white">No partner profile linked</p>
          <p className="text-xs text-gray-500 mt-1.5 px-8">
            This account isn&apos;t linked to a partner record yet. Ask your account
            manager to connect it so your bookings and earnings appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
