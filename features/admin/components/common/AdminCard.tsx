import styles from "./AdminCard.module.css";

type AdminCardProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function AdminCard({ children, className = "", id }: AdminCardProps) {
  return <div id={id} className={`${styles.card} ${className}`}>{children}</div>;
}
