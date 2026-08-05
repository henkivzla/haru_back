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

async function findExistingClienteId(connection, tiendaId, { id, cedula, telefono } = {}) {
  const existingId = Number(id);
  if (existingId > 0) {
    const [byId] = await connection.execute(
      `SELECT id FROM clientes
       WHERE id = ? AND tienda_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [existingId, tiendaId]
    );
    if (byId[0]?.id) return byId[0].id;
  }

  if (cedula) {
    const [byCedula] = await connection.execute(
      `SELECT id FROM clientes
       WHERE tienda_id = ? AND rif_cedula = ? AND deleted_at IS NULL
       ORDER BY id ASC
       LIMIT 1`,
      [tiendaId, cedula]
    );
    if (byCedula[0]?.id) return byCedula[0].id;
  }

  if (telefono) {
    const [byTelefono] = await connection.execute(
      `SELECT id FROM clientes
       WHERE tienda_id = ? AND telefono = ? AND deleted_at IS NULL
       ORDER BY id ASC
       LIMIT 1`,
      [tiendaId, telefono]
    );
    if (byTelefono[0]?.id) return byTelefono[0].id;
  }

  return null;
}

async function createClienteFromVenta(connection, tiendaId, cliente) {
  if (!tiendaId || !hasClienteData(cliente)) return null;

  const data = cliente && typeof cliente === 'object' ? cliente : {};

  const nombre = trimOrNull(data.nombre) || trimOrNull(data.apellido) || 'Cliente';
  const apellido = trimOrNull(data.apellido);
  const cedula = trimOrNull(data.cedula);
  const telefono = trimOrNull(data.telefono);
  const direccion = trimOrNull(data.direccion);

  const existingId = await findExistingClienteId(connection, tiendaId, {
    id: data.id || data.clienteId,
    cedula,
    telefono,
  });
  if (existingId) return existingId;

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
