import styles from "./AdminCard.module.css";

type AdminCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminCard({ children, className = "" }: AdminCardProps) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}
