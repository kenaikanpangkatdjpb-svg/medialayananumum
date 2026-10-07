import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Clock, AlertTriangle, Calendar, DollarSign, 
  Briefcase, Receipt, FileText, UserPlus, Award, CalendarDays, 
  BarChart3, Bell, Settings, Download, ChevronDown, CheckCircle2, 
  XCircle, Send, ArrowUpRight, ArrowDownRight, FileSpreadsheet,
  Building, Plane, CreditCard, ChevronRight, Filter, Car, Package, PlusCircle
} from 'lucide-react';
import { 
  RoomBooking, ItemBooking, VehicleBooking, 
  FacilityFeedback, MonthlyNeed, RealizationProgress 
} from '../types';

interface WorkforceSaasDashboardProps {
  roomBookings?: RoomBooking[];
  itemBookings?: ItemBooking[];
  vehicleBookings?: VehicleBooking[];
  feedbacks?: FacilityFeedback[];
  needs?: MonthlyNeed[];
  realizations?: RealizationProgress[];
  onNavigateToTab?: (tabId: string) => void;
}

export default function WorkforceSaasDashboard({ 
  roomBookings = [], 
  itemBookings = [], 
  vehicleBookings = [],
  onNavigateToTab 
}: WorkforceSaasDashboardProps) {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [activeWeekFilter, setActiveWeekFilter] = useState('This Week');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(1); // default Tue hovered
  const [overtimeApproved, setOvertimeApproved] = useState<boolean | null>(null);
  const [reminderSent, setReminderSent] = useState(false);

  // Active bookings for TODAY only (excluding previous days)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayStr();

  const isTodayBooking = (dateStr: string, durationDays: number = 1) => {
    if (!dateStr) return false;
    if (dateStr === todayStr) return true;
    if (dateStr < todayStr && durationDays > 1) {
      try {
        const start = new Date(dateStr);
        const end = new Date(start);
        end.setDate(start.getDate() + (durationDays - 1));
        const endStr = end.toISOString().split('T')[0];
        return todayStr >= dateStr && todayStr <= endStr;
      } catch {
        return false;
      }
    }
    return false;
  };

  const approvedRooms = roomBookings.filter(b => b.status === 'Disetujui' && isTodayBooking(b.date));
  const approvedVehicles = vehicleBookings.filter(v => v.status === 'Disetujui' && isTodayBooking(v.date, v.durationDays));
  const approvedItems = itemBookings.filter(i => (i.status === 'Dipinjam' || (i.status as string) === 'Disetujui') && isTodayBooking(i.date));
  const totalTodayAgendas = approvedRooms.length + approvedVehicles.length + approvedItems.length;

  // Weekly attendance data
  const weeklyData = [
    { day: 'Mon', onTime: 710, late: 90, absent: 320 },
    { day: 'Tue', onTime: 750, late: 80, absent: 350 },
    { day: 'Wed', onTime: 620, late: 110, absent: 400 },
    { day: 'Thu', onTime: 780, late: 70, absent: 290 },
    { day: 'Fri', onTime: 740, late: 85, absent: 310 },
    { day: 'Sat', onTime: 820, late: 60, absent: 240 },
    { day: 'Sun', onTime: 680, late: 95, absent: 360 },
  ];

  // Payroll trend data
  const payrollMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const baseSalaryTrend = [35, 38, 40, 42, 45, 48, 50, 49, 52, 55, 54, 58];
  const grossSalaryTrend = [45, 48, 50, 52, 55, 58, 60, 62, 63, 65, 66, 70];

  const sidebarCategories = [
    {
      title: 'Main Menu',
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, tab: 'dashboard-overview' }
      ]
    },
    {
      title: 'WORKFORCE MANAGEMENT',
      items: [
        { name: 'Attendance', icon: Users, tab: 'monitoring-abk' },
        { name: 'Timesheets', icon: Clock, tab: 'monitoring-kinerja' },
        { name: 'Overtime', icon: CalendarDays, tab: 'monitoring-dams' },
        { name: 'Shift Roster', icon: Calendar, tab: 'peminjaman-ruangan' },
      ]
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Payroll & Lembur', icon: DollarSign, tab: 'realisasi-lembur' },
        { name: 'Business Travel', icon: Plane, tab: 'peminjaman-kendaraan' },
        { name: 'Cash Advance & Claims', icon: CreditCard, tab: 'rencana-kebutuhan' },
      ]
    },
    {
      title: 'HR & TALENT',
      items: [
        { name: 'Employee Directory', icon: Users, tab: 'informasi-gkm' },
        { name: 'Recruitment', icon: UserPlus, tab: 'informasi-beasiswa' },
        { name: 'Performance (KPI)', icon: Award, tab: 'monitoring-kinerja' },
        { name: 'Leave Management', icon: FileText, tab: 'cek-seribu' },
      ]
    },
    {
      title: 'GENERAL',
      items: [
        { name: 'Reports & Analytics', icon: BarChart3, tab: 'katalog-hkt' },
        { name: 'Announcements', icon: Bell, tab: 't-lego' },
        { name: 'Settings', icon: Settings, tab: 'feedback-sarpras' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex text-xs">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-60 bg-white border-r border-slate-200 shrink-0 hidden md:flex flex-col justify-between p-4 space-y-6">
        <div className="space-y-5">
          
          {/* Loop over categories */}
          {sidebarCategories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                {cat.title}
              </span>
              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveMenu(item.name);
                        if (onNavigateToTab && item.tab) {
                          onNavigateToTab(item.tab);
                        }
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2D32A4] text-white shadow-md shadow-indigo-900/10 font-bold'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-display">
              Dashboard Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring agenda kegiatan, peminjaman sarpras, dan performa operasional Kanwil DJPb Riau.
            </p>
          </div>
        </div>

        {/* AGENDA & KEGIATAN HARI INI WIDGET */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                <Clock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-display font-black text-slate-800 text-sm md:text-base tracking-wider uppercase">
                    AGENDA & KEGIATAN HARI INI
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    AUTOMATIC
                  </span>
                </div>
                <p className="text-xs text-slate-500">Jadwal resmi rapat, peminjaman ruangan, dan penugasan kendaraan dinas yang disetujui</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab && onNavigateToTab('peminjaman-ruangan')}
              className="px-3.5 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Buat Agenda</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {totalTodayAgendas === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                <p className="font-semibold text-slate-600">Tidak ada agenda rapat atau peminjaman disetujui hari ini.</p>
                <p className="text-[10px] text-slate-400">Gunakan menu peminjaman untuk mengajukan sarana prasarana baru.</p>
              </div>
            ) : (
              <>
                {approvedRooms.map((room) => (
                  <div key={room.id} className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-djpb-blue font-bold">
                      <span className="flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5" />
                        <span>{room.roomName}</span>
                      </span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-blue-100 text-slate-700 font-bold">
                        {room.startTime} - {room.endTime}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{room.purpose}</p>
                    <p className="text-[10px] text-slate-500">Pemohon: {room.bookerName} ({room.division})</p>
                  </div>
                ))}

                {approvedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                      <span className="flex items-center space-x-1.5">
                        <Car className="w-3.5 h-3.5 text-amber-700" />
                        <span>{vehicle.vehicleName}</span>
                      </span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-amber-100 text-slate-700 font-bold">
                        {vehicle.driverOption || (vehicle.driverName?.includes('Tanpa') ? 'Tanpa Supir' : 'Dengan Supir')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">Tujuan: {vehicle.destination}</p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Pemohon: {vehicle.bookerName}</span>
                      <span className="font-mono text-amber-800 font-bold flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{vehicle.startTime || '08:00'} - {vehicle.endTime || '16:00'}</span>
                      </span>
                    </div>
                  </div>
                ))}

                {approvedItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                      <span className="flex items-center space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{item.itemName}</span>
                      </span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-100 text-emerald-800 font-bold">
                        {item.quantity} Unit
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.statusNote || 'Dipinjam untuk operasional'}</p>
                    <p className="text-[10px] text-slate-500">Pemohon: {item.bookerName} ({item.division})</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 1. TOP METRICS CARDS (4 BENTO STATS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Manpower */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Manpower</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900 font-display">1,247</span>
              <span className="text-[10px] font-semibold text-emerald-600 flex items-center">
                +23 from last month
              </span>
            </div>
          </div>

          {/* Card 2: Attendance Number */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Attendance Number</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900 font-display">94.2%</span>
              <span className="text-[10px] font-semibold text-emerald-600">
                +2.1% from last week
              </span>
            </div>
          </div>

          {/* Card 3: Absent */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Absent</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900 font-display">3</span>
              <span className="text-[10px] font-semibold text-rose-500">
                -50% vs last week
              </span>
            </div>
          </div>

          {/* Card 4: Late Check-ins */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Late Check-ins</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900 font-display">12</span>
              <span className="text-[10px] font-semibold text-rose-500">
                -2.1% vs last week
              </span>
            </div>
          </div>

        </div>

        {/* 2. MIDDLE ROW: WEEKLY ATTENDANCE TRENDS & ATTENTION REQUIRED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Weekly Attendance Trends Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs lg:col-span-8 flex flex-col justify-between space-y-4">
            
            {/* Header + Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Weekly Attendance Trends
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of On-time, Late, and Absent per day.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <select 
                    value={activeWeekFilter}
                    onChange={(e) => setActiveWeekFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-7 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option>This Week</option>
                    <option>Last Week</option>
                    <option>This Month</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                </div>

                <button 
                  onClick={() => alert('Exporting attendance trend data to Excel...')}
                  className="bg-[#1E8354] hover:bg-[#186a43] text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <span>Export Excel</span>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* STACKED BAR CHART CANVAS */}
            <div className="relative pt-6 pb-2">
              
              {/* Y-Axis Grid Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                <div className="border-b border-slate-100 pb-1 flex justify-between"><span>1,000</span></div>
                <div className="border-b border-slate-100 pb-1 flex justify-between"><span>800</span></div>
                <div className="border-b border-slate-100 pb-1 flex justify-between"><span>600</span></div>
                <div className="border-b border-slate-100 pb-1 flex justify-between"><span>400</span></div>
                <div className="border-b border-slate-100 pb-1 flex justify-between"><span>200</span></div>
                <div className="border-b border-slate-200 pb-1 flex justify-between"><span>0</span></div>
              </div>

              {/* Bars Container */}
              <div className="relative h-64 flex items-end justify-between px-6 pt-4">
                
                {weeklyData.map((d, index) => {
                  const totalHeightPct = ((d.onTime + d.late + d.absent) / 1200) * 100;
                  const onTimePct = (d.onTime / (d.onTime + d.late + d.absent)) * 100;
                  const latePct = (d.late / (d.onTime + d.late + d.absent)) * 100;
                  const absentPct = (d.absent / (d.onTime + d.late + d.absent)) * 100;

                  const isHovered = hoveredBarIndex === index;

                  return (
                    <div 
                      key={d.day} 
                      className="relative flex flex-col items-center group cursor-pointer"
                      onMouseEnter={() => setHoveredBarIndex(index)}
                    >
                      {/* Interactive Tooltip Card */}
                      {isHovered && (
                        <div className="absolute -top-20 z-30 bg-white/95 backdrop-blur-xs border border-slate-200 shadow-xl rounded-xl p-2.5 text-[10px] font-semibold text-slate-700 min-w-[130px] space-y-1 animate-in zoom-in-95 duration-150">
                          <div className="flex items-center space-x-1.5 text-slate-800 border-b border-slate-100 pb-1">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <span>Late : {d.late} People</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-slate-800 border-b border-slate-100 pb-1">
                            <span className="w-2 h-2 rounded-full bg-[#2D32A4]"></span>
                            <span>On Time : {d.onTime} People</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-slate-800">
                            <span className="w-2 h-2 rounded-full bg-indigo-300"></span>
                            <span>Absent : {d.absent} People</span>
                          </div>
                        </div>
                      )}

                      {/* Bar Stack */}
                      <div 
                        className={`w-9 sm:w-11 rounded-lg overflow-hidden transition-all duration-200 flex flex-col justify-end ${
                          isHovered ? 'ring-2 ring-[#2D32A4]/30 scale-105 shadow-md' : 'opacity-95'
                        }`}
                        style={{ height: `${totalHeightPct}%` }}
                      >
                        {/* Top segment: Absent (Lavender) */}
                        <div 
                          style={{ height: `${absentPct}%` }} 
                          className="bg-[#818CF8] hover:bg-[#6366F1] transition-colors"
                          title={`Absent: ${d.absent}`}
                        ></div>
                        {/* Middle segment: Late (Medium Indigo) */}
                        <div 
                          style={{ height: `${latePct}%` }} 
                          className="bg-[#A5B4FC] hover:bg-[#818CF8] transition-colors"
                          title={`Late: ${d.late}`}
                        ></div>
                        {/* Bottom segment: On Time (Deep Royal Indigo) */}
                        <div 
                          style={{ height: `${onTimePct}%` }} 
                          className="bg-[#2D32A4] hover:bg-[#1E2380] transition-colors"
                          title={`On Time: ${d.onTime}`}
                        ></div>
                      </div>

                      {/* Day Label */}
                      <span className={`text-[11px] font-medium mt-3 transition-colors ${
                        isHovered ? 'text-[#2D32A4] font-bold' : 'text-slate-500'
                      }`}>
                        {d.day}
                      </span>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center space-x-6 text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D32A4]"></span>
                <span>On Time</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A5B4FC]"></span>
                <span>Late</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#818CF8]"></span>
                <span>Absent</span>
              </div>
            </div>

          </div>

          {/* RIGHT: Attention Required Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <span className="text-xs font-bold">!</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Attention Required
                  </h3>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  3 Pending
                </span>
              </div>

              {/* Alert 1: Overtime Approval */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Overtime Approval</span>
                  <span className="text-[10px] text-slate-400 font-mono">10m ago</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs">Agus Pratama <span className="font-normal text-slate-500">(Site Beta)</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Requests 2 hours overtime.</p>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button 
                    onClick={() => setOvertimeApproved(true)}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      overtimeApproved === true 
                        ? 'bg-emerald-700 text-white' 
                        : 'bg-[#1E8354] hover:bg-[#186a43] text-white'
                    }`}
                  >
                    {overtimeApproved === true ? 'Approved ✓' : 'Approved'}
                  </button>
                  <button 
                    onClick={() => setOvertimeApproved(false)}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                      overtimeApproved === false 
                        ? 'bg-rose-100 border-rose-300 text-rose-700' 
                        : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    {overtimeApproved === false ? 'Rejected' : 'Reject'}
                  </button>
                </div>
              </div>

              {/* Alert 2: Missing Clock-Out */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Missing Clock-Out</span>
                  <span className="text-[10px] text-slate-400 font-mono">Yesterday</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  <strong className="text-slate-800">3 Employees at Site Alpha</strong> did not clock out.
                </p>

                <button 
                  onClick={() => {
                    setReminderSent(true);
                    setTimeout(() => setReminderSent(false), 3000);
                  }}
                  className="w-full py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{reminderSent ? 'Reminder Sent! ✓' : 'Send Reminder'}</span>
                </button>
              </div>
            </div>

            {/* Footer Notification Link */}
            <div className="text-center border-t border-slate-100 pt-3">
              <button 
                onClick={() => alert('Opening all pending workforce notifications...')}
                className="text-[#2D32A4] font-bold text-xs hover:underline cursor-pointer inline-flex items-center space-x-1"
              >
                <span>View All Notifications</span>
              </button>
            </div>

          </div>

        </div>

        {/* 3. BOTTOM ROW: MONTH PAYROLL COST TREND & PAYROLL COMPOSITION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Month Payroll Cost Trend Line Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs lg:col-span-8 flex flex-col justify-between space-y-4">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Month Payroll Cost Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total disbursement analysis
              </p>
            </div>

            {/* LINE / AREA CHART */}
            <div className="relative pt-4 pb-2">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                <div className="border-b border-slate-100 pb-1"><span>100</span></div>
                <div className="border-b border-slate-100 pb-1"><span>60</span></div>
                <div className="border-b border-slate-100 pb-1"><span>45</span></div>
                <div className="border-b border-slate-100 pb-1"><span>30</span></div>
                <div className="border-b border-slate-100 pb-1"><span>15</span></div>
              </div>

              {/* SVG Area Chart */}
              <div className="relative h-44 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160" preserveAspectRatio="none">
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2D32A4" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#2D32A4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Filled area */}
                  <path 
                    d="M 0,100 Q 50,95 100,90 T 200,85 T 300,70 T 400,65 T 500,60 T 600,50 L 600,160 L 0,160 Z" 
                    fill="url(#payrollGrad)" 
                  />

                  {/* Top Line (Gross Payroll) */}
                  <path 
                    d="M 0,100 Q 50,95 100,90 T 200,85 T 300,70 T 400,65 T 500,60 T 600,50" 
                    fill="none" 
                    stroke="#2D32A4" 
                    strokeWidth="2.5" 
                  />

                  {/* Bottom Line (Base Salary) */}
                  <path 
                    d="M 0,120 Q 50,118 100,115 T 200,110 T 300,100 T 400,98 T 500,95 T 600,85" 
                    fill="none" 
                    stroke="#818CF8" 
                    strokeWidth="2" 
                    strokeDasharray="4 2"
                  />
                </svg>

                {/* Floating Tooltip Box */}
                <div className="absolute top-10 left-12 bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md rounded-xl p-2 px-3 text-[11px] font-semibold text-slate-800 flex items-center space-x-3 pointer-events-none">
                  <span className="text-slate-500 font-normal">Jan</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-600">Total gross</span>
                    <span className="font-bold text-[#2D32A4]">Rp. 55M</span>
                  </div>
                </div>
              </div>

              {/* X Axis Months */}
              <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                {payrollMonths.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Payroll Composition Donut Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Payroll Composition
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current month breakdown
              </p>
            </div>

            {/* DONUT CHART SVG & LEGEND */}
            <div className="flex items-center justify-between gap-4 py-2">
              
              {/* Donut SVG */}
              <div className="relative w-36 h-36 shrink-0 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                  
                  {/* Basic Salary (Dark Indigo ~ 70%) */}
                  <circle 
                    cx="18" cy="18" r="15.9155" fill="none" stroke="#2D32A4" strokeWidth="4.5"
                    strokeDasharray="70 30" strokeDashoffset="0"
                  />

                  {/* BPJS/Tax (Lavender ~ 20%) */}
                  <circle 
                    cx="18" cy="18" r="15.9155" fill="none" stroke="#A5B4FC" strokeWidth="4.5"
                    strokeDasharray="20 80" strokeDashoffset="-70"
                  />

                  {/* Overtime (Yellow/Orange ~ 10%) */}
                  <circle 
                    cx="18" cy="18" r="15.9155" fill="none" stroke="#F59E0B" strokeWidth="4.5"
                    strokeDasharray="10 90" strokeDashoffset="-90"
                  />
                </svg>

                {/* Donut Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                  <span className="text-xs font-bold text-slate-800">100%</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-2.5 text-xs font-medium text-slate-700">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2D32A4]"></span>
                  <span>Basic Salary</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A5B4FC]"></span>
                  <span>BPJS / Tax</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                  <span>Overtime</span>
                </div>
              </div>

            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-[11px] text-slate-500">
              Disbursement complete for July 2026
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
