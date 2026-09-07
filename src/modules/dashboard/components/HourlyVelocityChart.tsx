import React, { useState } from 'react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import { HourlyDataPoint } from '../types';
import { Activity, Clock } from 'lucide-react';

interface HourlyVelocityChartProps {
  isManager: boolean;
  hourlyData: readonly HourlyDataPoint[];
}

export const HourlyVelocityChart: React.FC<HourlyVelocityChartProps> = ({
  isManager,
  hourlyData,
}) => {
  const { language } = useLanguage();

  // For manager: 'sales' | 'orders'
  // For staff: 'orders' | 'units'
  const [activeMetric, setActiveMetric] = useState<'sales' | 'orders' | 'units'>(
    isManager ? 'sales' : 'orders'
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxAmount = Math.max(...hourlyData.map((d) => d.amount));
  const maxOrders = Math.max(...hourlyData.map((d) => d.orders));
  const maxUnits = Math.max(...hourlyData.map((d) => d.units));

  const getCurrentVal = (d: HourlyDataPoint): number => {
    if (activeMetric === 'sales' && isManager) return d.amount;
    if (activeMetric === 'units') return d.units;
    return d.orders;
  };

  const maxVal = Math.max(
    1,
    activeMetric === 'sales' && isManager
      ? maxAmount
      : activeMetric === 'units'
      ? maxUnits
      : maxOrders
  );

  return (
    <Card id="dashboard-hourly-velocity-card" className="w-full lg:w-1/2 shadow-2xs">
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>
                {isManager
                  ? language === 'th'
                    ? 'ปริมาณยอดขายรายชั่วโมง'
                    : 'Hourly Sales Volume'
                  : language === 'th'
                  ? 'ความเร็วรอบการขาย & ช่วงเวลาพีค'
                  : 'Operational Rush Hours'}
              </span>
            </h3>
            <p className="text-xs text-text/70 mt-0.5">
              {isManager
                ? language === 'th'
                  ? 'แนวโน้มยอดขายและปริมาณคำสั่งซื้อประจำชั่วโมง'
                  : 'Peak operational volume and hourly velocity'
                : language === 'th'
                ? 'สถิติจำนวนคำสั่งซื้อและจำนวนชิ้นสินค้าที่คิดเงินในแต่ละช่วงเวลา'
                : 'Order dispatch volume and checkout lane velocity'}
            </p>
          </div>

          {/* Metric Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 bg-background rounded-lg border-border border-crisp">
            {isManager ? (
              <>
                <button
                  type="button"
                  id="chart-toggle-sales"
                  onClick={() => setActiveMetric('sales')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMetric === 'sales'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'ยอดขาย ($)' : 'Sales ($)'}
                </button>
                <button
                  type="button"
                  id="chart-toggle-orders"
                  onClick={() => setActiveMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMetric === 'orders'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'จำนวนบิล' : 'Orders'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  id="chart-toggle-orders-staff"
                  onClick={() => setActiveMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMetric === 'orders'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'จำนวนบิล' : 'Orders'}
                </button>
                <button
                  type="button"
                  id="chart-toggle-units-staff"
                  onClick={() => setActiveMetric('units')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMetric === 'units'
                      ? 'bg-card text-primary shadow-2xs'
                      : 'text-text/70 hover:text-text'
                  }`}
                >
                  {language === 'th' ? 'จำนวนชิ้น' : 'Units'}
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardBody className="p-4 sm:p-6">
        {/* Custom High-Fidelity SVG Curve Chart */}
        <div className="relative w-full select-none">
          <svg viewBox="0 0 500 220" className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="chartGlowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Dotted Gridlines for Depth */}
            <line
              x1="35"
              y1="30"
              x2="480"
              y2="30"
              stroke="var(--border-color)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="35"
              y1="75"
              x2="480"
              y2="75"
              stroke="var(--border-color)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="35"
              y1="120"
              x2="480"
              y2="120"
              stroke="var(--border-color)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
            <line
              x1="35"
              y1="165"
              x2="480"
              y2="165"
              stroke="var(--border-color)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />

            {/* Render the curve and points */}
            {(() => {
              const svgWidth = 500;
              const svgHeight = 220;
              const paddingLeft = 35;
              const paddingRight = 20;
              const paddingTop = 30;
              const paddingBottom = 40;
              const chartWidth = svgWidth - paddingLeft - paddingRight;
              const chartHeight = svgHeight - paddingTop - paddingBottom;

              const points = hourlyData.map((d, index) => {
                const x = paddingLeft + (index / (hourlyData.length - 1)) * chartWidth;
                const currentVal = getCurrentVal(d);
                const y = svgHeight - paddingBottom - (currentVal / maxVal) * chartHeight;
                return { x, y };
              });

              // Cubic bezier interpolation for smooth curve
              const buildBezierPath = (pts: { x: number; y: number }[]) => {
                if (pts.length === 0) return '';
                let d = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i];
                  const p1 = pts[i + 1];
                  const cpX1 = p0.x + (p1.x - p0.x) / 3;
                  const cpY1 = p0.y;
                  const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
                  const cpY2 = p1.y;
                  d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                }
                return d;
              };

              const linePath = buildBezierPath(points);
              const areaPath =
                points.length > 0
                  ? `${linePath} L ${points[points.length - 1].x} ${
                      svgHeight - paddingBottom
                    } L ${points[0].x} ${svgHeight - paddingBottom} Z`
                  : '';

              return (
                <>
                  {/* Fading area */}
                  {areaPath && <path d={areaPath} fill="url(#chartGlowGradient)" />}

                  {/* Main elegant curved trendline */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="var(--primary-color)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Vertical tracking cursor line on hover */}
                  {hoveredIndex !== null && points[hoveredIndex] && (
                    <line
                      x1={points[hoveredIndex].x}
                      y1={paddingTop}
                      x2={points[hoveredIndex].x}
                      y2={svgHeight - paddingBottom}
                      stroke="var(--primary-color)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Hover detector bars */}
                  {points.map((pt, i) => {
                    const stepHalf = chartWidth / (hourlyData.length - 1) / 2;
                    return (
                      <rect
                        key={`hover-${i}`}
                        x={pt.x - stepHalf}
                        y={paddingTop}
                        width={stepHalf * 2}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })}

                  {/* Data Dots */}
                  {points.map((pt, i) => {
                    const isSelected = hoveredIndex === i;
                    const val = getCurrentVal(hourlyData[i]);
                    const isPeak = val === maxVal;

                    return (
                      <g key={i}>
                        {(isSelected || isPeak) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isSelected ? '9' : '6'}
                            fill="var(--primary-color)"
                            opacity="0.25"
                            className="pointer-events-none transition-all duration-150"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? '4.5' : '3.5'}
                          fill="var(--card-color)"
                          stroke="var(--primary-color)"
                          strokeWidth={isSelected ? '2.5' : '2'}
                          className="pointer-events-none transition-all duration-150"
                        />
                      </g>
                    );
                  })}

                  {/* Horizontal hour label ticks */}
                  {points.map((pt, i) => {
                    const isSelected = hoveredIndex === i;
                    return (
                      <text
                        key={i}
                        x={pt.x}
                        y={svgHeight - 15}
                        textAnchor="middle"
                        className={`text-[9px] font-bold transition-all duration-150 pointer-events-none ${
                          isSelected ? 'fill-primary' : 'fill-text/50'
                        }`}
                      >
                        {hourlyData[i].hour}
                      </text>
                    );
                  })}
                </>
              );
            })()}
          </svg>

          {/* Overlaid Tooltip */}
          <div className="absolute top-2 right-2 min-h-[36px] bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border border-crisp shadow-md flex flex-col pointer-events-none transition-all duration-200">
            {hoveredIndex !== null ? (
              <>
                <span className="text-[10px] uppercase font-bold text-text/50 tracking-wider font-mono">
                  {hourlyData[hoveredIndex].hour}
                </span>
                <span className="text-xs font-black font-mono text-primary leading-tight">
                  {isManager && activeMetric === 'sales'
                    ? `$${hourlyData[hoveredIndex].amount} USD`
                    : activeMetric === 'units'
                    ? `${hourlyData[hoveredIndex].units} ${language === 'th' ? 'ชิ้น' : 'units'}`
                    : `${hourlyData[hoveredIndex].orders} ${language === 'th' ? 'บิลสำเร็จ' : 'bills'}`}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold text-text/50 tracking-wider font-mono">
                  {language === 'th' ? 'ช่วงเวลาพีคสูงสุด' : 'PEAK RUSH'} (12 PM)
                </span>
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
                  {isManager && activeMetric === 'sales'
                    ? `$310 USD`
                    : activeMetric === 'units'
                    ? `42 units`
                    : `28 bills`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>
              {language === 'th'
                ? 'ช่วงเวลาขายดีที่สุด: 12:00 PM (ช่วงมื้อเที่ยง)'
                : 'Peak Trading Velocity: 12:00 PM (Lunch Rush)'}
            </span>
          </div>
          <Badge variant="neutral" size="sm">
            {language === 'th' ? 'รวม 10 ชั่วโมง' : '10 Hours Logged'}
          </Badge>
        </div>
      </CardBody>
    </Card>
  );
};
