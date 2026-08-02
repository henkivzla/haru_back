function trimOrNull(value) {
  const v = String(value ?? '').trim();
  return v || null;
}

function hasClienteData(cliente) {
  const data = cliente && typeof cliente === 'object' ? cliente : {};
  return [
    data.nombre,
    data.apellido,
    data.cedula,
    data.telefono,
    data.direccion,
  ].some((v) => String(v ?? '').trim());
}

async function createClienteFromVenta(connection, tiendaId, cliente) {
  if (!tiendaId || !hasClienteData(cliente)) return null;

  const data = cliente && typeof cliente === 'object' ? cliente : {};

  const nombre = trimOrNull(data.nombre) || trimOrNull(data.apellido) || 'Cliente';
  const apellido = trimOrNull(data.apellido);
  const cedula = trimOrNull(data.cedula);
  const telefono = trimOrNull(data.telefono);
  const direccion = trimOrNull(data.direccion);

  const [result] = await connection.execute(
    `INSERT INTO clientes (tienda_id, nombre, apellido, rif_cedula, telefono, direccion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tiendaId, nombre, apellido, cedula, telefono, direccion]
  );

  return result.insertId;
}

module.exports = {
  hasClienteData,
  createClienteFromVenta,
};
