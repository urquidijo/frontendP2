export default function AdminAlerts() {
  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-medium text-primary">Avisos</p>
        <h2 className="text-3xl font-semibold text-gray-900">Centro de notificaciones</h2>
        <p className="text-sm text-gray-500">
          Aqui veras alertas de stock critico, pagos fallidos y tareas pendientes.
        </p>
      </header>

      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        No hay avisos pendientes. Cuando ocurra algo importante lo veras en este modulo.
      </div>
    </section>
  );
}
