import React, { useEffect, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || '';
const REFRESH_INTERVAL_MS = 15000;

async function authorizedFetch(path) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión de administrador activa');
  const token = await user.getIdToken();

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error ${res.status} consultando ${path}`);
  return res.json();
}

function timeAgo(dateInput) {
  if (!dateInput) return 'Sin datos';
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `Hace ${seconds} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? '' : 's'}`;
}

function StatCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

export default function VisitorAnalytics() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statsData, recentData] = await Promise.all([
        authorizedFetch('/api/visitors/admin/stats'),
        authorizedFetch('/api/visitors/admin/recent?limit=50'),
      ]);
      setStats(statsData);
      setRecent(recentData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) return <div style={styles.container}>Cargando analítica de visitantes...</div>;
  if (error) return <div style={styles.container}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Analítica de visitantes</h2>

      <div style={styles.statsGrid}>
        <StatCard label="Activos ahora" value={stats.activeNow} />
        <StatCard label="Visitas hoy" value={stats.todayVisits} />
        <StatCard label="Últimos 7 días" value={stats.last7DaysVisits} />
        <StatCard label="Total de visitas" value={stats.totalVisits} />
      </div>

      <div style={styles.columns}>
        <div style={styles.column}>
          <h3>Países más frecuentes</h3>
          <ul style={styles.list}>
            {stats.topCountries.map((c) => (
              <li key={c.country}>{c.country}: {c.count}</li>
            ))}
          </ul>
        </div>
        <div style={styles.column}>
          <h3>Ciudades más frecuentes</h3>
          <ul style={styles.list}>
            {stats.topCities.map((c) => (
              <li key={c.city}>{c.city}: {c.count}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Últimas visitas</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Ubicación</th>
              <th style={styles.th}>IP</th>
              <th style={styles.th}>Dispositivo</th>
              <th style={styles.th}>Navegador</th>
              <th style={styles.th}>Página</th>
              <th style={styles.th}>Última actividad</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((v) => (
              <tr key={v.visitorId}>
                <td style={styles.td}>{v.location}</td>
                <td style={styles.td}>{v.ipMasked}</td>
                <td style={styles.td}>{v.deviceType}</td>
                <td style={styles.td}>{v.browser}</td>
                <td style={styles.td}>{v.page}</td>
                <td style={styles.td}>{timeAgo(v.lastSeen)}</td>
                <td style={styles.td}>
                  <span style={{ color: v.isActive ? '#16a34a' : '#9ca3af' }}>
                    {v.isActive ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: 24, fontFamily: 'system-ui, sans-serif' },
  title: { marginBottom: 16 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  card: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 },
  cardLabel: { fontSize: 13, color: '#6b7280' },
  cardValue: { fontSize: 28, fontWeight: 700, marginTop: 4 },
  columns: { display: 'flex', gap: 32, flexWrap: 'wrap' },
  column: { minWidth: 220 },
  list: { paddingLeft: 18 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { textAlign: 'left', borderBottom: '2px solid #e5e7eb', padding: '8px 12px', fontSize: 13, color: '#6b7280' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '8px 12px', fontSize: 14 },
};
