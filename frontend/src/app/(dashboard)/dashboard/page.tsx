export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-slate-600 mt-2">Welcome to Line Creek FSC management platform</p>
      </div>

      {/* Dashboard grid - placeholder for widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-600 text-sm font-medium">Active Members</div>
          <div className="text-4xl font-bold mt-2 text-primary">0</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-600 text-sm font-medium">Pending Renewals</div>
          <div className="text-4xl font-bold mt-2 text-accent">0</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-600 text-sm font-medium">Upcoming Events</div>
          <div className="text-4xl font-bold mt-2 text-ice-blue">0</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-600 text-sm font-medium">Revenue (Month)</div>
          <div className="text-4xl font-bold mt-2 text-slate-dark">$0</div>
        </div>
      </div>
    </div>
  )
}
