interface SectionHeadingProps {
  index: string;
  title: string;
  hint?: string;
  id?: string;
}

export function SectionHeading({ index, title, hint, id }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <span className="section-index" aria-hidden="true">
        {index}
      </span>
      <div className="section-heading-text">
        <h2 id={id}>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </div>
    </div>
  );
}
