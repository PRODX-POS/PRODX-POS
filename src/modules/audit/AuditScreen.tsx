import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { auditApi } from '../../adapters/mockAdapter';
import { AuditLogEntry } from '../../domain/audit';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SearchInput } from '../../components/common/SearchInput';
import { Shield, RefreshCw, KeyRound, Terminal } from 'lucide-react';

export const AuditScreen: React.FC = () => {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<readonly AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const data = await auditApi.getLogs(session.currentStore.id, 50);
      setLogs(data);
    } catch (err) {
      console.error('[AuditScreen] Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [session]);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background no-scrollbar">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-border/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-primary" />
            <span>{t.audit.title}</span>
          </h1>
          <p className="text-xs text-text/70 mt-1">
            {t.audit.subtitle}
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={fetchLogs}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {t.audit.refreshLogs}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
        <div className="w-full lg:w-[45%] xl:w-[50%] flex flex-col gap-6 h-full">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder={t.audit.filterPlaceholder}
          />

          <Card className="bg-card border-border border-crisp rounded-lg shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border border-crisp text-text/70 bg-card font-medium">
                <th className="py-3.5 px-5">{t.audit.timestamp}</th>
                <th className="py-3.5 px-4">{t.audit.action}</th>
                <th className="py-3.5 px-4">{t.audit.user}</th>
                <th className="py-3.5 px-4">{t.audit.severity}</th>
                <th className="py-3.5 px-4">{t.audit.terminal}</th>
                <th className="py-3.5 px-5">{t.audit.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-background/80 transition-colors">
                  <td className="py-3 px-5 text-text/70 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-text">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-sans font-medium text-text">
                    {log.userName}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <Badge
                      variant={
                        log.severity === 'critical'
                          ? 'danger'
                          : log.severity === 'warn'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {log.severity}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-text/70 font-mono">{log.registerId}</td>
                  <td className="py-3 px-5 font-mono text-[11px] text-text/70 truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
        </div>
        <div className="hidden lg:flex w-full lg:w-[55%] xl:w-[50%] flex-col gap-6 h-full">
          <div className="flex-1 border border-border border-crisp rounded-lg bg-card shadow-2xs flex flex-col items-center justify-center p-8 text-center">
            <div className="text-text/40 mb-3 border border-border rounded-full p-4 bg-background">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-click"><path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-1.2"/><path d="m21.3 13.7-2.6-1.5"/><path d="m11 21.6 2-2.4"/><path d="m19 19-3.2-3.2"/><path d="m14 15 7-1 4-13-13 4-1 7 8 2 1-7-8-2-1 7Z"/><path d="M9.5 9.5 4 15.5 8 19.5l6-5.5"/></svg>
            </div>
            <h3 className="text-sm font-bold text-text mb-1">Select an item to view details</h3>
            <p className="text-xs text-text/50 max-w-[250px]">Choose an item from the list on the left to view full details and available actions.</p>
          </div>
        </div>
        </div>
    </div>
  );
};
