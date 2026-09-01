import styles from "./AdminControls.module.css";

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function AdminButton({
  variant = "primary",
  className = "",
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      className={`${styles.button} ${styles[variant]} ${className}`}
    />
  );
}
