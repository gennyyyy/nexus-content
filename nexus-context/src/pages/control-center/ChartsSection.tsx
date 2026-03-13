import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import type { ControlCenterSnapshot, ActivityEvent } from "../../lib/api";

interface ChartsSectionProps {
    snapshot: ControlCenterSnapshot;
    activity: ActivityEvent[];
}

const COLORS = {
    todo: "#64748b", // slate-500
    in_progress: "#8b5cf6", // violet-500
    done: "#10b981", // emerald-500
    blocked: "#f43f5e", // rose-500
    ready: "#0ea5e9", // sky-500
};

export function ChartsSection({ snapshot, activity }: ChartsSectionProps) {
    const statusData = useMemo(() => [
        { name: "To Do", value: snapshot.todo_count, color: COLORS.todo },
        { name: "In Progress", value: snapshot.in_progress_count, color: COLORS.in_progress },
        { name: "Done", value: snapshot.done_count, color: COLORS.done },
        { name: "Blocked", value: snapshot.blocked_count, color: COLORS.blocked },
    ].filter(item => item.value > 0), [snapshot]);

    const activityData = useMemo(() => {
        const last7Days = new Array(7).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const counts = activity.reduce((acc, event) => {
            const date = event.created_at.split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return last7Days.map(date => ({
            date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
            count: counts[date] || 0,
        }));
    }, [activity]);

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-6 backdrop-blur-xl">
                <h3 className="mb-6 text-sm font-medium text-zinc-400">Task Status Distribution</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#e4e4e7' }}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-6 backdrop-blur-xl">
                <h3 className="mb-6 text-sm font-medium text-zinc-400">Activity Volume (Last 7 Days)</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#71717a" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#71717a" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#27272a' }}
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#e4e4e7' }}
                            />
                            <Bar 
                                dataKey="count" 
                                fill="#3b82f6" 
                                radius={[4, 4, 0, 0]} 
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
