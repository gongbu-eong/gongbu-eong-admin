import { MetricItem } from "@/features/admin/data/dashboard";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import styles from "./MetricCard.module.css";

type MetricCardProps = {
  metric: MetricItem;
};

export function MetricCard({ metric }: MetricCardProps) {
  return (
    <AdminCard className={styles.card}>
      <p className={styles.label}>{metric.label}</p>
      <div className={styles.row}>
        <p className={styles.value}>
          {metric.value}
          {metric.unit ? <span>{metric.unit}</span> : null}
        </p>
        <p
          className={`${styles.delta} ${
            metric.trend === "down" ? styles.down : styles.up
          }`}
        >
          {metric.delta}
        </p>
      </div>
    </AdminCard>
  );
}
