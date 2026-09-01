import styles from "./AdminTable.module.css";

type AdminTableProps<T> = {
  columns: Array<{
    key: keyof T | string;
    label: string;
    align?: "left" | "center" | "right";
    render?: (row: T) => React.ReactNode;
  }>;
  rows: T[];
};

export function AdminTable<T extends Record<string, React.ReactNode>>({
  columns,
  rows,
}: AdminTableProps<T>) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th className={styles[column.align ?? "left"]} key={String(column.key)}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td className={styles[column.align ?? "left"]} key={String(column.key)}>
                {column.render ? column.render(row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
