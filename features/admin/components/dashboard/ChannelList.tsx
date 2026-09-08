import Image from "next/image";
import Link from "next/link";
import { ChannelItem } from "@/features/admin/data/dashboard";
import styles from "./ChannelList.module.css";

type ChannelListProps = {
  items: ChannelItem[];
  total: string;
};

export function ChannelList({ items, total }: ChannelListProps) {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h2>유입 채널</h2>
          <p>오늘 유입 로그 기준 · 총 {total}건</p>
        </div>
        <Link href="/traffic/logs">전체보기 &gt;</Link>
      </header>
      <div className={styles.list}>
        {items.map((item) => (
          <div className={styles.item} key={item.label}>
            <span className={`${styles.icon} ${item.iconClass ? styles[item.iconClass] : ""}`}>
              <Image src={item.icon} width={40} height={40} alt="" />
            </span>
            <div className={styles.body}>
              <div className={styles.top}>
                <strong>{item.label}</strong>
                <b>
                  {item.value}
                  <span>{item.count}</span>
                </b>
              </div>
              <div className={styles.track}>
                <i style={{ width: `${item.fill}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
