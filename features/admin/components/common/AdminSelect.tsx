import styles from "./AdminControls.module.css";

type AdminSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function AdminSelect({ className = "", children, ...props }: AdminSelectProps) {
  return (
    <span className={`${styles.selectWrap} ${className}`}>
      <select {...props} className={styles.select}>
        {children}
      </select>
    </span>
  );
}
