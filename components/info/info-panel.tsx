type InfoPanelProps = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function InfoPanel({ eyebrow, title, body, ctaLabel, ctaHref }: InfoPanelProps) {
  const paragraphs = body.split("\n\n").filter(Boolean);

  return (
    <section className="info-card">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div className="info-copy">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {ctaLabel && ctaHref ? (
        <a href={ctaHref} className="button button-primary" target="_blank" rel="noreferrer">
          {ctaLabel}
        </a>
      ) : null}
    </section>
  );
}
