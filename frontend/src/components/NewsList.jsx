export default function NewsList({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No recent news found.</div>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <li key={i}>
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-primary)", textDecoration: "none", fontSize: 13.5, fontWeight: 500, lineHeight: 1.4 }}
          >
            {item.title}
          </a>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
            {item.publisher || "Unknown source"}
          </div>
        </li>
      ))}
    </ul>
  );
}
