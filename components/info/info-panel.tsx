type InfoPanelProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  hoursTodayLabel?: string;
  hoursTodayMessage?: string;
  weeklySchedule?: Array<{
    day: string;
    hours: string;
    isClosed: boolean;
  }>;
};

export function InfoPanel({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  hoursTodayLabel,
  hoursTodayMessage,
  weeklySchedule
}: InfoPanelProps) {
  const paragraphs = body.split("\n\n").filter(Boolean);
  const isLocationPanel = eyebrow === "Ubicacion";
  const hasWeeklySchedule = Boolean(weeklySchedule?.length);
  const mapQuery = body.trim();
  const mapEmbedSrc = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`
    : "";

  return (
    <section className="info-card">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="info-copy">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {hasWeeklySchedule ? (
        <div className="hours-card">
          <div className="hours-today-summary">
            <span className="hours-summary-label">Hoy</span>
            <strong>{hoursTodayLabel || "Horario no disponible"}</strong>
            {hoursTodayMessage ? <p>{hoursTodayMessage}</p> : null}
          </div>
          <div className="hours-weekly-list" aria-label="Horario semanal">
            {weeklySchedule?.map((entry) => (
              <div key={entry.day} className="hours-weekly-row">
                <span className="hours-weekly-day">{entry.day}</span>
                <span className={`hours-weekly-value ${entry.isClosed ? "hours-weekly-value-closed" : ""}`}>
                  {entry.hours}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {isLocationPanel && mapEmbedSrc ? (
        <div className="info-map-block">
          <div className="info-map-frame">
            <iframe
              src={mapEmbedSrc}
              title="Mapa del negocio"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          {ctaHref ? (
            <a href={ctaHref} className="info-map-link" target="_blank" rel="noreferrer">
              Ver en Google Maps
            </a>
          ) : null}
        </div>
      ) : ctaLabel && ctaHref ? (
        <a href={ctaHref} className="button button-primary" target="_blank" rel="noreferrer">
          {ctaLabel}
        </a>
      ) : null}
    </section>
  );
}
