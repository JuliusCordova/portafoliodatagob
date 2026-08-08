import styles from "./ProductNavigation.module.css";

const navigationItems = [
  {
    href: "/",
    label: "Dashboard principal",
    description: "Intake, backlog, scoring y vista ejecutiva"
  },
  {
    href: "/committee",
    label: "Comité operativo",
    description: "Decisión final, justificación y trazabilidad"
  }
];

export default function ProductNavigation() {
  return (
    <nav className={styles.shell} aria-label="ATLAS product navigation">
      <div className={styles.brandBlock}>
        <span className={styles.eyebrow}>ATLAS DataGob</span>
        <strong>Demand Governance Cockpit</strong>
      </div>
      <div className={styles.links}>
        {navigationItems.map((item) => (
          <a key={item.href} href={item.href} className={styles.link}>
            <span>{item.label}</span>
            <small>{item.description}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}
