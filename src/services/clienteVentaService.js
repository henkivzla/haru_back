function trimOrNull(value) {
  const v = String(value ?? '').trim();
  return v || null;
}

function hasClienteData(cliente = {}) {
  return [
    cliente.nombre,
    cliente.apellido,
    cliente.cedula,
    cliente.telefono,
    cliente.direccion,
  ].some((v) => String(v ?? '').trim());
}

async function createClienteFromVenta(connection, tiendaId, cliente = {}) {
  if (!tiendaId || !hasClienteData(cliente)) return null;

  const nombre = trimOrNull(cliente.nombre) || trimOrNull(cliente.apellido) || 'Cliente';
  const apellido = trimOrNull(cliente.apellido);
  const cedula = trimOrNull(cliente.cedula);
  const telefono = trimOrNull(cliente.telefono);
  const direccion = trimOrNull(cliente.direccion);

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
