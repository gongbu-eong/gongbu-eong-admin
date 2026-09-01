import Image from "next/image";
import { WorkItem } from "@/features/admin/data/dashboard";
import styles from "./WorkList.module.css";

type WorkListProps = {
  items: WorkItem[];
};

export function WorkList({ items }: WorkListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2>처리할 일</h2>
        <p>지금 확인이 필요해요</p>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.title}>
            <span className={styles.icon}>
              <Image src={item.icon} width={40} height={40} alt="" />
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
            </div>
            <b className={item.valueTone === "danger" ? styles.danger : ""}>
              {item.value}
            </b>
          </div>
        ))}
      </div>
    </section>
  );
}
