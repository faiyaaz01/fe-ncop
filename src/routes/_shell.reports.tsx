import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Reveal } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mockClients as clients,
  countryDistribution,
  inquiryStatusData,
  monthlySales,
  productPerformance,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics · Nourish Pharmaceutical ERP" },
      {
        name: "description",
        content:
          "Revenue, sales, top clients, country distribution, inquiry status and product performance analytics.",
      },
      { property: "og:title", content: "Reports & Analytics · Nourish Pharmaceutical ERP" },
      {
        property: "og:description",
        content: "Pharmaceutical sales analytics across markets, clients and product lines.",
      },
    ],
  }),
  component: Reports,
});

const tip = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
};

function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Analytics"
        description="Commercial performance across markets, clients and product lines for FY 2026."
        actions={
          <>
            <Select defaultValue="ytd">
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtd">Month to date</SelectItem>
                <SelectItem value="qtd">Quarter to date</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast("PDF report generated")}>
              <Download className="size-4" /> PDF
            </Button>
            <Button onClick={() => toast.success("XLSX export ready to download")}>
              <FileSpreadsheet className="size-4" /> Export XLSX
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Panel>
            <h2 className="text-base font-semibold">Revenue trend</h2>
            <p className="text-xs text-muted-foreground">Recognised revenue ($k)</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySales} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...tip} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2.6}
                    dot={false}
                    animationDuration={1400}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <h2 className="text-base font-semibold">Sales volume</h2>
            <p className="text-xs text-muted-foreground">Units shipped (k)</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...tip} />
                  <Bar
                    dataKey="sales"
                    radius={[6, 6, 0, 0]}
                    fill="var(--chart-2)"
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel>
            <h2 className="text-base font-semibold">Top clients</h2>
            <p className="text-xs text-muted-foreground">Revenue YTD ($M)</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={clients.map((c) => ({
                    name: c.name,
                    value: +(c.revenue / 1_000_000).toFixed(2),
                  }))}
                  margin={{ left: 40, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...tip} />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    fill="var(--chart-1)"
                    animationDuration={1200}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <h2 className="text-base font-semibold">Country distribution</h2>
            <p className="text-xs text-muted-foreground">Share of shipped volume</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryDistribution}
                    dataKey="value"
                    nameKey="country"
                    outerRadius={92}
                    stroke="none"
                    animationDuration={1100}
                    label={{ fontSize: 10 }}
                  >
                    {countryDistribution.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>

        <Reveal>
          <Panel>
            <h2 className="text-base font-semibold">Inquiry status</h2>
            <p className="text-xs text-muted-foreground">Open pipeline breakdown</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={inquiryStatusData}
                  innerRadius="25%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar dataKey="count" cornerRadius={8} background animationDuration={1300}>
                    {inquiryStatusData.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </RadialBar>
                  <Tooltip {...tip} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {inquiryStatusData.map((s, i) => (
                <li
                  key={s.status}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: `var(--chart-${(i % 5) + 1})` }}
                  />
                  {s.status} · {s.count}
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel>
            <h2 className="text-base font-semibold">Product performance</h2>
            <p className="text-xs text-muted-foreground">Units (M) vs. gross margin (%)</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip {...tip} />
                  <Bar
                    dataKey="units"
                    radius={[6, 6, 0, 0]}
                    fill="var(--chart-3)"
                    animationDuration={1200}
                  />
                  <Bar
                    dataKey="margin"
                    radius={[6, 6, 0, 0]}
                    fill="var(--chart-2)"
                    animationDuration={1400}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
