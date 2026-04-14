type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({
  title = "No pudimos cargar esta web-app",
  message
}: ErrorStateProps) {
  return (
    <div className="state-card">
      <span className="badge badge-danger">Error</span>
      <h2>{title}</h2>
      <p>{message}</p>
      <p className="state-help">
        Verifica que el link incluya un <code>tenant_id</code> valido. Ejemplo:
        <br />
        <code>?tenant_id=resto_demo</code>
      </p>
    </div>
  );
}
