import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useSound } from '../../context/SoundContext';
import { Battery, BatteryCharging, BatteryLow, AlertTriangle } from 'lucide-react';

export const BatteryIndicator: React.FC = () => {
  const { language } = useLanguage();
  const { playWarning } = useSound();

  const [battery, setBattery] = useState<{
    level: number; // 0 to 1
    charging: boolean;
    supported: boolean;
    simulated: boolean;
  }>({
    level: 1.0,
    charging: false,
    supported: false,
    simulated: false,
  });

  // Keep track of warning play state to avoid spamming sounds
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    let batteryObj: any = null;

    const updateBatteryStatus = (bat: any) => {
      setBattery({
        level: bat.level,
        charging: bat.charging,
        supported: true,
        simulated: false,
      });
    };

    const handleChargingChange = (e: any) => {
      setBattery(prev => ({ ...prev, charging: e.target.charging }));
    };

    const handleLevelChange = (e: any) => {
      setBattery(prev => ({ ...prev, level: e.target.level }));
    };

    // Query Web Battery API
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((bat: any) => {
        batteryObj = bat;
        updateBatteryStatus(bat);

        bat.addEventListener('chargingchange', handleChargingChange);
        bat.addEventListener('levelchange', handleLevelChange);
      }).catch(() => {
        // Fallback to simulation if promise fails (e.g., inside iframe sandbox restrictions)
        startSimulation();
      });
    } else {
      // API not supported (e.g., Safari, Firefox) - Use clean simulator
      startSimulation();
    }

    function startSimulation() {
      setBattery({
        level: 0.18, // Start at 18% so cashiers can instantly see the "Low Power" warning UI in action!
        charging: false,
        supported: false,
        simulated: true,
      });
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('chargingchange', handleChargingChange);
        batteryObj.removeEventListener('levelchange', handleLevelChange);
      }
    };
  }, []);

  const percentage = Math.round(battery.level * 100);
  const isLow = percentage <= 20;

  // Sound cue trigger on low power
  useEffect(() => {
    if (isLow && !battery.charging && !hasWarned) {
      if (playWarning) {
        playWarning();
      }
      setHasWarned(true);
    } else if (!isLow || battery.charging) {
      setHasWarned(false);
    }
  }, [isLow, battery.charging, playWarning, hasWarned]);

  // Click on battery to toggle simulation charging (purely for demonstration & interactive testing)
  const handleToggleCharging = () => {
    if (battery.simulated) {
      setBattery(prev => {
        const nextCharging = !prev.charging;
        return {
          ...prev,
          charging: nextCharging,
          level: nextCharging ? Math.min(1.0, prev.level + 0.1) : 0.18,
        };
      });
    }
  };

  // Color matching based on level & charging
  let borderClass = 'border-border border-crisp';
  let bgClass = 'bg-card text-text/80';
  let levelColor = 'bg-emerald-500';

  if (battery.charging) {
    borderClass = 'border-emerald-500/30';
    bgClass = 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
    levelColor = 'bg-emerald-500';
  } else if (percentage <= 20) {
    borderClass = 'border-rose-500/40';
    bgClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 animate-pulse';
    levelColor = 'bg-rose-500';
  } else if (percentage <= 50) {
    borderClass = 'border-amber-500/30';
    bgClass = 'bg-amber-500/10 text-amber-800 dark:text-amber-300';
    levelColor = 'bg-amber-500';
  }

  return (
    <div
      onClick={handleToggleCharging}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-150 shadow-2xs select-none ${bgClass} ${borderClass} ${battery.simulated ? 'cursor-pointer hover:border-primary/40' : ''}`}
      title={`${
        battery.simulated 
          ? (language === 'th' ? 'โหมดจำลองสถานะ (คลิกเพื่อสลับเสียบสายชาร์จ)' : 'Simulated Terminal Battery (Click to toggle charge)')
          : (language === 'th' ? 'ระดับแบตเตอรี่แท็บเล็ตหน้าร้าน' : 'Web Battery Status API')
      }: ${percentage}%`}
    >
      <div className="relative flex items-center shrink-0">
        {battery.charging ? (
          <BatteryCharging className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
        ) : isLow ? (
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 animate-bounce shrink-0" />
            <BatteryLow className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0" />
          </div>
        ) : (
          <Battery className="h-4 w-4 text-text/60 shrink-0" />
        )}

        {/* Mini Battery Level Bar inside or underneath if desired - keeping it simple and sleek */}
      </div>

      <div className="flex flex-col items-start leading-none gap-0.5">
        <span className="font-mono text-xs font-bold">{percentage}%</span>
        {isLow && !battery.charging && (
          <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 animate-pulse">
            {language === 'th' ? 'ชาร์จด่วน!' : 'LOW POWER'}
          </span>
        )}
        {battery.charging && (
          <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {language === 'th' ? 'กำลังชาร์จ' : 'CHARGING'}
          </span>
        )}
        {!isLow && !battery.charging && (
          <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-text/40">
            {battery.simulated ? 'DEMO' : 'BATTERY'}
          </span>
        )}
      </div>
    </div>
  );
};
