const BASE_FEATURES = ['dashboard', 'pos', 'inventario', 'bcv', 'caja', 'resumen', 'clientes'];
const ESTANDAR_FEATURES = ['cuentas', 'gastos'];
const PRO_FEATURES = ['estadisticas', 'multi_sucursal'];

const ROUTE_FEATURES = {
  '/cuentas/pendientes': 'cuentas',
  '/productos': 'inventario'
};

function resolveFeatures(planSlug) {
  const slug = (planSlug || 'economico').toLowerCase();
  const features = new Set(BASE_FEATURES);

  if (slug === 'estandar' || slug === 'pro') {
    ESTANDAR_FEATURES.forEach(f => features.add(f));
  }
  if (slug === 'pro') {
    PRO_FEATURES.forEach(f => features.add(f));
  }

  features.add('planes');
  return [...features];
}

module.exports = {
  BASE_FEATURES,
  ESTANDAR_FEATURES,
  PRO_FEATURES,
  ROUTE_FEATURES,
  resolveFeatures
};
